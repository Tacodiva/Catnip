import { SpiderNumberType, SpiderOpcodes, SpiderValueType } from "wasm-spider";
import { CatnipCompilerWasmGenContext, CatnipCompilerWasmLocal } from "../../CatnipCompilerWasmGenContext";
import { CatnipWasmStructTarget } from "../../../wasm-interop/CatnipWasmStructTarget";
import { CatnipIrInputOp, CatnipIrInputOpType } from "../../CatnipIrOp";
import { CatnipTarget } from '../../../runtime/CatnipTarget';
import { CatnipCompilerValue } from "../../CatnipCompilerValue";
import { CatnipValueFormat } from "../../CatnipValueFormat";
import { CatnipIrBasicBlock } from "../../CatnipIrBasicBlock";
import { CatnipCompilerState } from "../../CatnipCompilerState";
import { CatnipList } from "../../../runtime/CatnipList";
import { CatnipWasmStructList } from "../../../wasm-interop/CatnipWasmStructList";
import { CatnipValueFormatUtils } from "../../CatnipValueFormatUtils";
import { ir_convert } from "../core/convert";
import { CatnipWasmUnionValue, VALUE_STRING_MASK } from "../../../wasm-interop/CatnipWasmStructValue";

export type get_list_item_ir_inputs = { target: CatnipTarget, list: CatnipList };

export const ir_get_list_item = new class extends CatnipIrInputOpType<get_list_item_ir_inputs> {
    constructor() { super("get_list_item"); }

    public getOperandCount(): number { return 1; }

    public getResult(ir: CatnipIrInputOp<get_list_item_ir_inputs>, state?: CatnipCompilerState): CatnipCompilerValue {
        return CatnipCompilerValue.dynamic(CatnipValueFormat.F64);
    }

    public generateWasm(ctx: CatnipCompilerWasmGenContext, ir: CatnipIrInputOp<get_list_item_ir_inputs>, branch: CatnipIrBasicBlock): void {


        const list = ir.inputs.list;
        const target = ir.inputs.target;
        const listOffset = list.index * CatnipWasmStructList.size;

        this.emitBoundsCheck(ctx, { allowEqualToLength: false, allowLast: true },
            ir.operands[0], target, list, (ctx, indexVariable) => {
                // Get the pointer to the list's data
                ctx.emitWasmConst(SpiderNumberType.i32, target.structWrapper.ptr);
                ctx.emitWasm(SpiderOpcodes.i32_load, 2, CatnipWasmStructTarget.getMemberOffset("list_table"));
                ctx.emitWasm(SpiderOpcodes.i32_load, 2, listOffset + CatnipWasmStructList.getMemberOffset("data"));

                // Get the offset of this index within the array
                ctx.emitWasm(SpiderOpcodes.local_get, indexVariable.ref);
                ctx.emitWasmConst(SpiderNumberType.i32, CatnipWasmUnionValue.size);
                ctx.emitWasm(SpiderOpcodes.i32_mul);

                // Add them to get the pointer of the value, and actually load it
                ctx.emitWasm(SpiderOpcodes.i32_add);
                ctx.emitWasm(SpiderOpcodes.f64_load, 3, 0);
            }, (ctx) => {
                ctx.emitWasmConst(SpiderNumberType.i64, VALUE_STRING_MASK | BigInt(ctx.createHeapString("")));
                ctx.emitWasm(SpiderOpcodes.f64_reinterpret_i64);
            },
            SpiderNumberType.f64);

    }

    public emitBoundsCheck(
        ctx: CatnipCompilerWasmGenContext,
        cfg: {
            allowEqualToLength: boolean,
            allowLast: boolean,
        },
        index: CatnipCompilerValue,
        target: CatnipTarget,
        list: CatnipList,
        success: (ctx: CatnipCompilerWasmGenContext, index: CatnipCompilerWasmLocal) => void,
        outOfRange: (ctx: CatnipCompilerWasmGenContext) => void,
        blocktype: SpiderValueType | undefined
    ): void {

        const needConversion = !CatnipValueFormatUtils.isAlways(index.format, CatnipValueFormat.I32_NUMBER);

        const castIndexVariable = ctx.createLocal(SpiderNumberType.i32);
        const rawIndexVariable = ctx.createLocal(CatnipValueFormatUtils.getFormatSpiderType(index.format));

        if (needConversion) {
            ctx.emitWasm(SpiderOpcodes.local_set, rawIndexVariable.ref);
        } else {
            ctx.emitWasm(SpiderOpcodes.local_set, castIndexVariable.ref);
        }

        ctx.pushExpression(); // block 1

        ctx.pushExpression(); // block 2

        ctx.pushExpression(); // block 3

        if (needConversion) {

            if (!CatnipValueFormatUtils.isAlways(index.format, CatnipValueFormat.F64)) {
                throw new Error("Not supported.");
            }

            ctx.emitWasm(SpiderOpcodes.local_get, rawIndexVariable.ref);

            ir_convert.emitStringCheck(ctx, index.format,
                (ctx) => {
                    ctx.emitWasm(SpiderOpcodes.local_get, rawIndexVariable.ref);
                    ir_convert.emitConversion(ctx, CatnipValueFormat.F64_BOXED_I32_HSTRING, CatnipValueFormat.I32_HSTRING);

                    const stringLocal = ctx.createLocal(SpiderNumberType.i32);
                    ctx.emitWasm(SpiderOpcodes.local_set, stringLocal.ref);

                    // We need to check if this string is one of the special strings

                    if (cfg.allowLast) {
                        const isConstLast = index.isConstant && index.asConstantString() === "last";

                        if (isConstLast) {
                            ctx.emitWasmConst(SpiderNumberType.i32, 1);
                        } else {
                            ctx.emitWasm(SpiderOpcodes.local_get, stringLocal.ref);
                            ctx.emitWasmConst(SpiderNumberType.i32, ctx.createHeapString("last"));
                            ctx.emitWasmRuntimeFunctionCall("catnip_blockutil_hstring_eq_strict");
                        }

                        // if
                        ctx.pushExpression();

                        // The index is 'last', we need to find the last index and jump to the end
                        ctx.emitWasmConst(SpiderNumberType.i32, target.structWrapper.ptr);
                        ctx.emitWasm(SpiderOpcodes.i32_load, 2, CatnipWasmStructTarget.getMemberOffset("list_table"));
                        ctx.emitWasm(SpiderOpcodes.i32_load, 2, list.index * CatnipWasmStructList.size + CatnipWasmStructList.getMemberOffset("length"));

                        // Subtract 1
                        ctx.emitWasmConst(SpiderNumberType.i32, 1);
                        ctx.emitWasm(SpiderOpcodes.i32_sub);

                        // Set the index
                        ctx.emitWasm(SpiderOpcodes.local_tee, castIndexVariable.ref);

                        // If it's 0, we go to out of range
                        ctx.emitWasm(SpiderOpcodes.i32_eqz);
                        ctx.emitWasm(SpiderOpcodes.br_if, 3); // out of range

                        // Otherwise, success!
                        ctx.emitWasm(SpiderOpcodes.br, 2); // Success


                        ctx.emitWasm(SpiderOpcodes.if, ctx.popExpression());

                        if (isConstLast) {
                            ctx.releaseLocal(stringLocal);
                            return;
                        }
                    }

                    // TODO any or random here

                    // Cast our string into a int and set it
                    ctx.emitWasm(SpiderOpcodes.local_get, stringLocal.ref);
                    ir_convert.emitConversion(ctx, CatnipValueFormat.I32_HSTRING, CatnipValueFormat.I32_NUMBER);
                    ctx.emitWasm(SpiderOpcodes.local_set, castIndexVariable.ref);

                    ctx.releaseLocal(stringLocal);
                },
                (ctx) => {
                    ctx.emitWasm(SpiderOpcodes.local_get, rawIndexVariable.ref);
                    ir_convert.emitConversion(ctx, index.format & CatnipValueFormat.F64_NUMBER_OR_NAN, CatnipValueFormat.I32_NUMBER);
                    ctx.emitWasm(SpiderOpcodes.local_set, castIndexVariable.ref);
                }
            );
        }

        // Subtract 1
        ctx.emitWasm(SpiderOpcodes.local_get, castIndexVariable.ref);
        ctx.emitWasmConst(SpiderNumberType.i32, 1);
        ctx.emitWasm(SpiderOpcodes.i32_sub);

        ctx.emitWasm(SpiderOpcodes.local_tee, castIndexVariable.ref);
        ctx.emitWasmConst(SpiderNumberType.i32, 0);
        ctx.emitWasm(SpiderOpcodes.i32_lt_s);

        ctx.emitWasm(SpiderOpcodes.br_if, 1); // out of range

        ctx.emitWasm(SpiderOpcodes.local_get, castIndexVariable.ref);

        ctx.emitWasmConst(SpiderNumberType.i32, target.structWrapper.ptr);
        ctx.emitWasm(SpiderOpcodes.i32_load, 2, CatnipWasmStructTarget.getMemberOffset("list_table"));
        ctx.emitWasm(SpiderOpcodes.i32_load, 2, list.index * CatnipWasmStructList.size + CatnipWasmStructList.getMemberOffset("length"));

        if (cfg.allowEqualToLength) {
            ctx.emitWasm(SpiderOpcodes.i32_gt_s);
        } else {
            ctx.emitWasm(SpiderOpcodes.i32_ge_s);
        }

        ctx.emitWasm(SpiderOpcodes.br_if, 1); // out of range

        // Fall through to success

        ctx.emitWasm(SpiderOpcodes.block, ctx.popExpression());

        // Success
        success(ctx, castIndexVariable);

        ctx.emitWasm(SpiderOpcodes.br, 1); // end

        ctx.emitWasm(SpiderOpcodes.block, ctx.popExpression());

        // out of range
        outOfRange(ctx);

        ctx.emitWasm(SpiderOpcodes.block, ctx.popExpression(), blocktype);

        ctx.releaseLocal(castIndexVariable);
        ctx.releaseLocal(rawIndexVariable);
    }

}


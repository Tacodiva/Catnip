import { SpiderNumberType, SpiderOpcodes } from "wasm-spider";
import { CatnipCompilerWasmGenContext } from "../../CatnipCompilerWasmGenContext";
import { CatnipWasmStructTarget } from "../../../wasm-interop/CatnipWasmStructTarget";
import { CatnipIrCommandOpType, CatnipIrInputOp } from "../../CatnipIrOp";
import { CatnipTarget } from '../../../runtime/CatnipTarget';
import { CatnipIrBasicBlock } from "../../CatnipIrBasicBlock";
import { CatnipList } from "../../../runtime/CatnipList";
import { CatnipWasmStructList } from "../../../wasm-interop/CatnipWasmStructList";
import { CatnipValueFormatUtils } from "../../CatnipValueFormatUtils";
import { CatnipValueFormat } from "../../CatnipValueFormat";
import { ir_cast } from "../core/cast";
import { ir_get_list_item } from "./get_list_item";
import { CatnipWasmUnionValue } from "../../../wasm-interop/CatnipWasmStructValue";

export type insert_list_item_ir_inputs = { target: CatnipTarget, list: CatnipList };

export const ir_insert_list_item = new class extends CatnipIrCommandOpType<insert_list_item_ir_inputs> {
    constructor() { super("data_insert_list_item"); }

    public getOperandCount(): number { return 2; }

    public generateWasm(ctx: CatnipCompilerWasmGenContext, ir: CatnipIrInputOp<insert_list_item_ir_inputs>, branch: CatnipIrBasicBlock): void {
        const list = ir.inputs.list;
        const target = ir.inputs.target;
        const indexFormat = ir.operands[1].format; // TODO optimize constant here

        const listOffset = list._index * CatnipWasmStructList.size;

        if (CatnipValueFormatUtils.isSometimes(indexFormat, CatnipValueFormat.F64_BOXED_I32_HSTRING)) {
            // If the index could be a string, we need to check if it's one of the special values "last", "any" or "random"


        }

        ir_cast.cast(ctx, indexFormat, CatnipValueFormat.I32_NUMBER);

        const indexVariable = ctx.createLocal(SpiderNumberType.i32);
        ctx.emitWasm(SpiderOpcodes.local_set, indexVariable.ref);

        const valueVariable = ctx.createLocal(SpiderNumberType.f64);
        ctx.emitWasm(SpiderOpcodes.local_set, valueVariable.ref);

        ir_get_list_item.emitBoundsCheck(ctx, {
            allowEqualToLength: true
        }, indexVariable, target, list, (ctx) => {
            ctx.emitWasm(SpiderOpcodes.local_get, indexVariable.ref);
            ctx.emitWasm(SpiderOpcodes.local_get, valueVariable.ref);

            // Get the pointer to the list's data
            ctx.emitWasmConst(SpiderNumberType.i32, target.structWrapper.ptr);
            ctx.emitWasm(SpiderOpcodes.i32_load, 2, CatnipWasmStructTarget.getMemberOffset("list_table"));
            ctx.emitWasmConst(SpiderNumberType.i32, listOffset);
            ctx.emitWasm(SpiderOpcodes.i32_add);
            
            ctx.emitWasmRuntimeFunctionCall("catnip_blockutil_list_insert_at");
        }, () => {}, undefined);

        ctx.releaseLocal(indexVariable);
        ctx.releaseLocal(valueVariable);
    }

}


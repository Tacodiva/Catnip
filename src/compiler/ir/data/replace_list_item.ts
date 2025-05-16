import { SpiderNumberType, SpiderOpcodes } from "wasm-spider";
import { CatnipCompilerWasmGenContext } from "../../CatnipCompilerWasmGenContext";
import { CatnipWasmStructTarget } from "../../../wasm-interop/CatnipWasmStructTarget";
import { CatnipIrCommandOpType, CatnipIrInputOp } from "../../CatnipIrOp";
import { CatnipTarget } from '../../../runtime/CatnipTarget';
import { CatnipIrBasicBlock } from "../../CatnipIrBasicBlock";
import { CatnipList } from "../../../runtime/CatnipList";
import { CatnipWasmStructList } from "../../../wasm-interop/CatnipWasmStructList";
import { CatnipValueFormatUtils } from "../../CatnipValueFormatUtils";
import { ir_get_list_item } from "./get_list_item";
import { CatnipWasmUnionValue } from "../../../wasm-interop/CatnipWasmStructValue";

export type replace_list_item_ir_inputs = { target: CatnipTarget, list: CatnipList };

export const ir_replace_list_item = new class extends CatnipIrCommandOpType<replace_list_item_ir_inputs> {
    constructor() { super("data_replace_list_item"); }

    public getOperandCount(): number { return 2; }

    public generateWasm(ctx: CatnipCompilerWasmGenContext, ir: CatnipIrInputOp<replace_list_item_ir_inputs>, branch: CatnipIrBasicBlock): void {
        const list = ir.inputs.list;
        const target = ir.inputs.target;
        const listOffset = list.index * CatnipWasmStructList.size;

        const uncastIndexVariable = ctx.createLocal(CatnipValueFormatUtils.getFormatSpiderType(ir.operands[1].format));
        ctx.emitWasm(SpiderOpcodes.local_set, uncastIndexVariable.ref);

        const valueVariable = ctx.createLocal(SpiderNumberType.f64);
        ctx.emitWasm(SpiderOpcodes.local_set, valueVariable.ref);

        ctx.emitWasm(SpiderOpcodes.local_get, uncastIndexVariable.ref);

        ir_get_list_item.emitBoundsCheck(ctx, {
            allowEqualToLength: false, allowLast: true,
        }, ir.operands[1], target, list, (ctx, indexVariable) => {
            // Get the pointer to the list's data
            ctx.emitWasmConst(SpiderNumberType.i32, target.structWrapper.ptr);
            ctx.emitWasm(SpiderOpcodes.i32_load, 2, CatnipWasmStructTarget.getMemberOffset("list_table"));
            ctx.emitWasm(SpiderOpcodes.i32_load, 2, listOffset + CatnipWasmStructList.getMemberOffset("data"));

            // Get the offset of this index within the array
            ctx.emitWasm(SpiderOpcodes.local_get, indexVariable.ref);
            ctx.emitWasmConst(SpiderNumberType.i32, CatnipWasmUnionValue.size);
            ctx.emitWasm(SpiderOpcodes.i32_mul);
            ctx.emitWasm(SpiderOpcodes.i32_add);

            // Set the value!
            ctx.emitWasm(SpiderOpcodes.local_get, valueVariable.ref);
            ctx.emitWasm(SpiderOpcodes.f64_store, 3, 0);
        }, () => {}, undefined);

        ctx.releaseLocal(uncastIndexVariable);
        ctx.releaseLocal(valueVariable);
    }

}


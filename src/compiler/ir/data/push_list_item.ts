import { SpiderNumberType, SpiderOpcodes } from "wasm-spider";
import { CatnipCompilerWasmGenContext } from "../../CatnipCompilerWasmGenContext";
import { CatnipWasmStructTarget } from "../../../wasm-interop/CatnipWasmStructTarget";
import { CatnipIrCommandOpType, CatnipIrInputOp } from "../../CatnipIrOp";
import { CatnipTarget } from '../../../runtime/CatnipTarget';
import { CatnipIrBasicBlock } from "../../CatnipIrBasicBlock";
import { CatnipList } from "../../../runtime/CatnipList";
import { CatnipWasmStructList } from "../../../wasm-interop/CatnipWasmStructList";

export type push_list_item_ir_inputs = { target: CatnipTarget, list: CatnipList };

export const ir_push_list_item = new class extends CatnipIrCommandOpType<push_list_item_ir_inputs> {
    constructor() { super("data_push_list_item"); }

    public getOperandCount(): number { return 1; }

    public generateWasm(ctx: CatnipCompilerWasmGenContext, ir: CatnipIrInputOp<push_list_item_ir_inputs>, branch: CatnipIrBasicBlock): void {
        const list = ir.inputs.list;
        const target = ir.inputs.target;
        
        const listOffset = list.index * CatnipWasmStructList.size;

        ctx.emitWasmConst(SpiderNumberType.i32, target.structWrapper.ptr);
        ctx.emitWasm(SpiderOpcodes.i32_load, 2, CatnipWasmStructTarget.getMemberOffset("list_table"));
        ctx.emitWasmConst(SpiderNumberType.i32, listOffset);
        ctx.emitWasm(SpiderOpcodes.i32_add);

        ctx.emitWasmRuntimeFunctionCall("catnip_blockutil_list_push");
    }

}


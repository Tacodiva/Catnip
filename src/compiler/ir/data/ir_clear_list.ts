import { SpiderNumberType, SpiderOpcodes } from "wasm-spider";
import { CatnipCompilerWasmGenContext } from "../../CatnipCompilerWasmGenContext";
import { CatnipVariable } from "../../../runtime/CatnipVariable";
import { CatnipWasmStructTarget } from "../../../wasm-interop/CatnipWasmStructTarget";
import { CatnipWasmUnionValue } from "../../../wasm-interop/CatnipWasmStructValue";
import { CatnipIrCommandOpType, CatnipIrInputOp, CatnipIrInputOpType, CatnipReadonlyIrInputOp } from "../../CatnipIrOp";
import { CatnipTarget } from '../../../runtime/CatnipTarget';
import { CatnipCompilerValue } from "../../CatnipCompilerValue";
import { CatnipValueFormat } from "../../CatnipValueFormat";
import { CatnipIrBasicBlock } from "../../CatnipIrBasicBlock";
import { CatnipCompilerState } from "../../CatnipCompilerState";
import { CatnipList } from "../../../runtime/CatnipList";
import { CatnipWasmStructList } from "../../../wasm-interop/CatnipWasmStructList";

export type clear_list_ir_inputs = { target: CatnipTarget, list: CatnipList };

export const ir_clear_list = new class extends CatnipIrCommandOpType<clear_list_ir_inputs> {
    constructor() { super("data_clear_list"); }

    public getOperandCount(): number { return 0; }

    public generateWasm(ctx: CatnipCompilerWasmGenContext, ir: CatnipIrInputOp<clear_list_ir_inputs>, branch: CatnipIrBasicBlock): void {
        const list = ir.inputs.list;
        const target = ir.inputs.target;
        
        const listOffset = list.index * CatnipWasmStructList.size;

        // To clear a list, we just set its length to 0
        ctx.emitWasmConst(SpiderNumberType.i32, target.structWrapper.ptr);
        ctx.emitWasm(SpiderOpcodes.i32_load, 2, CatnipWasmStructTarget.getMemberOffset("list_table"));
        ctx.emitWasmConst(SpiderNumberType.i32, 0);
        ctx.emitWasm(SpiderOpcodes.i32_store, 2, listOffset + CatnipWasmStructList.getMemberOffset("length"));
    }

}


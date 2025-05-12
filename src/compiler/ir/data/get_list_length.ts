import { SpiderNumberType, SpiderOpcodes } from "wasm-spider";
import { CatnipCompilerWasmGenContext } from "../../CatnipCompilerWasmGenContext";
import { CatnipVariable } from "../../../runtime/CatnipVariable";
import { CatnipWasmStructTarget } from "../../../wasm-interop/CatnipWasmStructTarget";
import { CatnipWasmUnionValue } from "../../../wasm-interop/CatnipWasmStructValue";
import { CatnipIrInputOp, CatnipIrInputOpType } from "../../CatnipIrOp";
import { CatnipTarget } from '../../../runtime/CatnipTarget';
import { CatnipCompilerValue } from "../../CatnipCompilerValue";
import { CatnipValueFormat } from "../../CatnipValueFormat";
import { CatnipIrBasicBlock } from "../../CatnipIrBasicBlock";
import { CatnipCompilerState } from "../../CatnipCompilerState";
import { CatnipList } from "../../../runtime/CatnipList";
import { CatnipWasmStructList } from "../../../wasm-interop/CatnipWasmStructList";

export type get_list_length_ir_inputs = { target: CatnipTarget, list: CatnipList };

export const ir_get_list_length = new class extends CatnipIrInputOpType<get_list_length_ir_inputs> {
    constructor() { super("data_get_list_length"); }

    public getOperandCount(): number { return 0; }

    public getResult(ir: CatnipIrInputOp<get_list_length_ir_inputs>, state?: CatnipCompilerState): CatnipCompilerValue {
        return CatnipCompilerValue.dynamic(CatnipValueFormat.I32_NUMBER);
    }    

    public generateWasm(ctx: CatnipCompilerWasmGenContext, ir: CatnipIrInputOp<get_list_length_ir_inputs>, branch: CatnipIrBasicBlock): void {
        const list = ir.inputs.list;
        const target = ir.inputs.target;
        
        const listOffset = list.index * CatnipWasmStructList.size;

        ctx.emitWasmConst(SpiderNumberType.i32, target.structWrapper.ptr);
        ctx.emitWasm(SpiderOpcodes.i32_load, 2, CatnipWasmStructTarget.getMemberOffset("list_table"));
        ctx.emitWasm(SpiderOpcodes.i32_load, 2, listOffset + CatnipWasmStructList.getMemberOffset("length"));
    }

}


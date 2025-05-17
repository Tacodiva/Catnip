import { SpiderNumberType, SpiderOpcodes } from "wasm-spider";
import { CatnipCompilerWasmGenContext } from "../../CatnipCompilerWasmGenContext";
import { CatnipWasmStructTarget } from "../../../wasm-interop/CatnipWasmStructTarget";
import { CatnipIrCommandOpType, CatnipIrInputOp, CatnipIrInputOpType, CatnipIrOpBranches } from "../../CatnipIrOp";
import { CatnipTarget } from '../../../runtime/CatnipTarget';
import { CatnipIrBasicBlock } from "../../CatnipIrBasicBlock";
import { CatnipList } from "../../../runtime/CatnipList";
import { CatnipWasmStructList } from "../../../wasm-interop/CatnipWasmStructList";
import { CatnipCompilerState } from "../../CatnipCompilerState";
import { CatnipCompilerValue } from "../../CatnipCompilerValue";
import { CatnipValueFormat } from "../../CatnipValueFormat";

export type list_index_of_ir_inputs = { target: CatnipTarget, list: CatnipList };

export const ir_list_index_of = new class extends CatnipIrInputOpType<list_index_of_ir_inputs> {
    constructor() { super("data_list_index_of"); }
    
    public getOperandCount(): number { return 1; }

    public getResult(): CatnipCompilerValue {
        return CatnipCompilerValue.dynamic(CatnipValueFormat.I32_NUMBER);
    }

    public generateWasm(ctx: CatnipCompilerWasmGenContext, ir: CatnipIrInputOp<list_index_of_ir_inputs>, branch: CatnipIrBasicBlock): void {
        const list = ir.inputs.list;
        const target = ir.inputs.target;

        const listOffset = list.index * CatnipWasmStructList.size;

        // Get a pointer to the list
        ctx.emitWasmConst(SpiderNumberType.i32, target.structWrapper.ptr);
        ctx.emitWasm(SpiderOpcodes.i32_load, 2, CatnipWasmStructTarget.getMemberOffset("list_table"));
        ctx.emitWasmConst(SpiderNumberType.i32, listOffset);
        ctx.emitWasm(SpiderOpcodes.i32_add);

        ctx.emitWasmGetRuntime();
        ctx.emitWasmRuntimeFunctionCall("catnip_blockutil_list_index_of");
    }

}


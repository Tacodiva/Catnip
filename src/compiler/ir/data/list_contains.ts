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

export type list_contains_ir_inputs = { target: CatnipTarget, list: CatnipList };

export const ir_list_contains = new class extends CatnipIrInputOpType<list_contains_ir_inputs> {
    constructor() { super("data_list_contains"); }
    
    public getOperandCount(): number { return 1; }

    public getResult(): CatnipCompilerValue {
        return CatnipCompilerValue.dynamic(CatnipValueFormat.I32_BOOLEAN);
    }

    public generateWasm(ctx: CatnipCompilerWasmGenContext, ir: CatnipIrInputOp<list_contains_ir_inputs>, branch: CatnipIrBasicBlock): void {
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

        // TODO is this necessary? Does I32_BOOLEAN allow for non-1 trues?
        ctx.emitWasm(SpiderOpcodes.i32_eqz);
        ctx.emitWasm(SpiderOpcodes.i32_eqz);
    }

}


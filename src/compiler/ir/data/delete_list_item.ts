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

export type delete_list_item_ir_inputs = { target: CatnipTarget, list: CatnipList };

export const ir_delete_list_item = new class extends CatnipIrCommandOpType<delete_list_item_ir_inputs> {
    constructor() { super("data_delete_list_item"); }

    public getOperandCount(): number { return 1; }

    public generateWasm(ctx: CatnipCompilerWasmGenContext, ir: CatnipIrInputOp<delete_list_item_ir_inputs>, branch: CatnipIrBasicBlock): void {
        const list = ir.inputs.list;
        const target = ir.inputs.target;
        const listOffset = list._index * CatnipWasmStructList.size;

        ir_get_list_item.emitBoundsCheck(ctx, { allowEqualToLength: false, allowLast: true },
            ir.operands[0], target, list, (ctx, indexVariable) => {
            ctx.emitWasm(SpiderOpcodes.local_get, indexVariable.ref);

            // Get the pointer to the list's data
            ctx.emitWasmConst(SpiderNumberType.i32, target.structWrapper.ptr);
            ctx.emitWasm(SpiderOpcodes.i32_load, 2, CatnipWasmStructTarget.getMemberOffset("list_table"));
            ctx.emitWasmConst(SpiderNumberType.i32, listOffset);
            ctx.emitWasm(SpiderOpcodes.i32_add);
            
            ctx.emitWasmRuntimeFunctionCall("catnip_blockutil_list_delete_at");
        }, (ctx) => {}, undefined);
    }

}


import { SpiderNumberType, SpiderOpcodes } from "wasm-spider";
import { CatnipCompilerWasmGenContext } from "../../CatnipCompilerWasmGenContext";
import { CatnipWasmStructTarget } from "../../../wasm-interop/CatnipWasmStructTarget";
import { CatnipIrInputOp, CatnipIrInputOpType, CatnipReadonlyIrInputOp } from "../../CatnipIrOp";
import { CatnipTarget } from '../../../runtime/CatnipTarget';
import { CatnipCompilerValue } from "../../CatnipCompilerValue";
import { CatnipValueFormat } from "../../CatnipValueFormat";
import { CatnipIrBasicBlock } from "../../CatnipIrBasicBlock";
import { CatnipCompilerState } from "../../CatnipCompilerState";
import { CatnipList } from "../../../runtime/CatnipList";
import { CatnipWasmStructList } from "../../../wasm-interop/CatnipWasmStructList";
import { CatnipValueFormatUtils } from "../../CatnipValueFormatUtils";
import { ir_cast } from "../core/cast";
import { CatnipWasmUnionValue, VALUE_STRING_MASK } from "../../../wasm-interop/CatnipWasmStructValue";

export type get_list_item_ir_inputs = { target: CatnipTarget, list: CatnipList };

export const ir_get_list_item = new class extends CatnipIrInputOpType<get_list_item_ir_inputs> {
    constructor() { super("ir_get_list_item"); }

    public getOperandCount(): number { return 1; }

    public getResult(ir: CatnipReadonlyIrInputOp<get_list_item_ir_inputs>, state?: CatnipCompilerState): CatnipCompilerValue {
        return CatnipCompilerValue.dynamic(CatnipValueFormat.F64);
    }    

    public generateWasm(ctx: CatnipCompilerWasmGenContext, ir: CatnipIrInputOp<get_list_item_ir_inputs>, branch: CatnipIrBasicBlock): void {


        const list = ir.inputs.list;
        const target = ir.inputs.target;
        const indexFormat = ir.operands[0].format; // TODO optimize constant here

        const listOffset = list._index * CatnipWasmStructList.size;

        if (CatnipValueFormatUtils.isSometimes(indexFormat, CatnipValueFormat.F64_BOXED_I32_HSTRING)) {
            // If the index could be a string, we need to check if it's one of the special values "last", "any" or "random"



        }
    
        ir_cast.cast(ctx, indexFormat, CatnipValueFormat.I32_NUMBER);
        
        ctx.emitWasmConst(SpiderNumberType.i32, 1);
        ctx.emitWasm(SpiderOpcodes.i32_sub);
        const indexVariable = ctx.createLocal(SpiderNumberType.i32);
        ctx.emitWasm(SpiderOpcodes.local_set, indexVariable.ref);
        
        
        // Bounds checking!!!
        
        ctx.pushExpression(); // block
        
        ctx.emitWasm(SpiderOpcodes.local_get, indexVariable.ref);
        ctx.emitWasmConst(SpiderNumberType.i32, 0);
        ctx.emitWasm(SpiderOpcodes.i32_lt_s);
        // if (index < 0)
        ctx.pushExpression();

        ctx.emitWasmConst(SpiderNumberType.i64, VALUE_STRING_MASK | BigInt(ctx.alloateHeapString("")));
        ctx.emitWasm(SpiderOpcodes.f64_reinterpret_i64);
        ctx.emitWasm(SpiderOpcodes.br, 1);

        const trueExpr1 = ctx.popExpression();

        ctx.pushExpression();
        // else 

        ctx.emitWasm(SpiderOpcodes.local_get, indexVariable.ref);

        ctx.emitWasmConst(SpiderNumberType.i32, target.structWrapper.ptr);
        ctx.emitWasm(SpiderOpcodes.i32_load, 2, CatnipWasmStructTarget.getMemberOffset("list_table"));
        ctx.emitWasm(SpiderOpcodes.i32_load, 2, listOffset + CatnipWasmStructList.getMemberOffset("length"));

        ctx.emitWasm(SpiderOpcodes.i32_ge_s);

        // if (index >= list.length)
        ctx.pushExpression();
        ctx.emitWasmConst(SpiderNumberType.i64, VALUE_STRING_MASK | BigInt(ctx.alloateHeapString("")));
        ctx.emitWasm(SpiderOpcodes.f64_reinterpret_i64);
        ctx.emitWasm(SpiderOpcodes.br, 2);

        const trueExpr2 = ctx.popExpression();

        ctx.emitWasm(SpiderOpcodes.if, trueExpr2);

        const falseExpr1 = ctx.popExpression();

        ctx.emitWasm(SpiderOpcodes.if, trueExpr1, falseExpr1);

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
        
        ctx.releaseLocal(indexVariable);

        ctx.emitWasm(SpiderOpcodes.block, ctx.popExpression(), SpiderNumberType.f64);
    }

}


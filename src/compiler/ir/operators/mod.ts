import { SpiderNumberType, SpiderOpcodes } from "wasm-spider";
import { CatnipCompilerWasmGenContext } from "../../CatnipCompilerWasmGenContext";
import { CatnipIrInputOp, CatnipIrInputOpType, } from "../../CatnipIrOp";
import { CatnipCompilerValue } from "../../CatnipCompilerValue";
import { CatnipValueFormat } from "../../CatnipValueFormat";
import { CatnipValueFormatUtils } from "../../CatnipValueFormatUtils";

export const ir_mod = new class extends CatnipIrInputOpType {
    public constructor() { super("operators_mod"); }

    public getOperandCount(): number {
        return 2;
    }

    public getResult(ir: CatnipIrInputOp): CatnipCompilerValue {
        if (ir.operands[0].isConstant && ir.operands[1].isConstant) {
            const value = ir.operands[0].asConstantNumber() % ir.operands[1].asConstantNumber();
            return CatnipCompilerValue.constant(value, CatnipValueFormatUtils.getNumberFormat(value));
        }

        return CatnipCompilerValue.dynamic(CatnipValueFormat.F64_NUMBER_OR_NAN);
    }

    public generateWasm(ctx: CatnipCompilerWasmGenContext, ir: CatnipIrInputOp): void {        
        const modulus = ctx.createLocal(SpiderNumberType.f64);
        
        ctx.emitWasm(SpiderOpcodes.local_tee, modulus.ref);
        ctx.emitWasmRuntimeFunctionCall("catnip_math_fmod");
        
        const result = ctx.createLocal(SpiderNumberType.f64);
        ctx.emitWasm(SpiderOpcodes.local_tee, result.ref);
        
        ctx.emitWasm(SpiderOpcodes.local_get, modulus.ref);
        
        // result / modulus
        ctx.emitWasm(SpiderOpcodes.f64_div);

        ctx.emitWasmConst(SpiderNumberType.f64, 0);

        ctx.emitWasm(SpiderOpcodes.f64_lt);

        // if (result / modulus) < 0
        const ifBlock = ctx.pushExpression();

        ctx.emitWasm(SpiderOpcodes.local_get, result.ref);
        ctx.emitWasm(SpiderOpcodes.local_get, modulus.ref);
        ctx.emitWasm(SpiderOpcodes.f64_add);
        ctx.emitWasm(SpiderOpcodes.local_set, result.ref);

        ctx.emitWasm(SpiderOpcodes.if, ctx.popExpression());

        ctx.emitWasm(SpiderOpcodes.local_get, result.ref);

        ctx.releaseLocal(modulus);
        ctx.releaseLocal(result);
    }
}


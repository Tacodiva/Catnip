import { SpiderNumberType, SpiderOpcodes } from "wasm-spider";
import { CatnipCompilerWasmGenContext } from "../../CatnipCompilerWasmGenContext";
import { CatnipIrInputOp, CatnipIrInputOpType } from "../../CatnipIrOp";
import { CatnipCompilerValue } from "../../CatnipCompilerValue";
import { CatnipValueFormat } from "../../CatnipValueFormat";
import { CatnipValueFormatUtils } from "../../CatnipValueFormatUtils";

export const ir_cmp_gt = new class extends CatnipIrInputOpType<{}> {
    public constructor() { super("operators_cmp_gt"); }

    public getOperandCount(inputs: {}, branches: {}): number {
        return 2;
    }

    public getResult(): CatnipCompilerValue {
        return CatnipCompilerValue.dynamic(CatnipValueFormat.I32_BOOLEAN);
    }

    public generateWasm(ctx: CatnipCompilerWasmGenContext, ir: CatnipIrInputOp<{}>): void {
        const leftFormat = ir.operands[0].format;
        const rightFormat = ir.operands[1].format;

        if (CatnipValueFormatUtils.isAlways(leftFormat, CatnipValueFormat.F64_NUMBER_OR_NAN)
            && CatnipValueFormatUtils.isAlways(rightFormat, CatnipValueFormat.F64_NUMBER_OR_NAN)) {

            if (CatnipValueFormatUtils.isSometimes(rightFormat, CatnipValueFormat.F64_NAN)) {

                const rightTemp = ctx.createLocal(SpiderNumberType.f64);

                // NaN check on the right value
                ctx.emitWasm(SpiderOpcodes.local_tee, rightTemp.ref);
                ctx.emitWasm(SpiderOpcodes.local_get, rightTemp.ref);
                ctx.emitWasm(SpiderOpcodes.f64_eq);

                ctx.pushExpression();
                // The right is not NaN. The left might be NaN though.
                if (CatnipValueFormatUtils.isSometimes(leftFormat, CatnipValueFormat.F64_NAN)) {
                    const leftTemp = ctx.createLocal(SpiderNumberType.f64);

                    // NaN check on the left value
                    ctx.emitWasm(SpiderOpcodes.local_tee, leftTemp.ref);
                    ctx.emitWasm(SpiderOpcodes.local_get, leftTemp.ref);
                    ctx.emitWasm(SpiderOpcodes.f64_eq);

                    ctx.pushExpression();
                    // Right is not NaN and left is not NaN.
                    ctx.emitWasm(SpiderOpcodes.local_get, leftTemp.ref);
                    ctx.emitWasm(SpiderOpcodes.local_get, rightTemp.ref);
                    ctx.emitWasm(SpiderOpcodes.f64_gt);
                    const innerTrueBranch = ctx.popExpression();

                    ctx.pushExpression();
                    // Right is not NaN and left is NaN.
                    ctx.emitWasm(SpiderOpcodes.local_get, leftTemp.ref);
                    ctx.emitWasm(SpiderOpcodes.local_get, rightTemp.ref);
                    ctx.emitWasmGetRuntime();
                    ctx.emitWasmRuntimeFunctionCall("catnip_blockutil_value_cmp");
                    ctx.emitWasmConst(SpiderNumberType.i32, 0);
                    ctx.emitWasm(SpiderOpcodes.i32_gt_s);
                    const innerFalseBranch = ctx.popExpression();

                    ctx.emitWasm(SpiderOpcodes.if, innerTrueBranch, innerFalseBranch, SpiderNumberType.i32);

                    ctx.releaseLocal(leftTemp);

                } else {
                    // Right is not NaN and left can't be NaN.
                    ctx.emitWasm(SpiderOpcodes.f64_gt);
                }
                const trueBranch = ctx.popExpression();

                ctx.pushExpression();
                // The right is NaN.
                ctx.emitWasm(SpiderOpcodes.local_get, rightTemp.ref);
                ctx.emitWasmGetRuntime();
                ctx.emitWasmRuntimeFunctionCall("catnip_blockutil_value_cmp");
                ctx.emitWasmConst(SpiderNumberType.i32, 0);
                ctx.emitWasm(SpiderOpcodes.i32_gt_s);
                const falseBranch = ctx.popExpression();

                ctx.emitWasm(SpiderOpcodes.if, trueBranch, falseBranch, SpiderNumberType.i32);

                ctx.releaseLocal(rightTemp);
            } else if (CatnipValueFormatUtils.isSometimes(leftFormat, CatnipValueFormat.F64_NAN)) {
                // The right cannot be NaN, but the left could be.

                const rightTemp = ctx.createLocal(SpiderNumberType.f64);
                ctx.emitWasm(SpiderOpcodes.local_set, rightTemp.ref);

                const leftTemp = ctx.createLocal(SpiderNumberType.f64);
                // NaN check on the left value
                ctx.emitWasm(SpiderOpcodes.local_tee, leftTemp.ref);
                ctx.emitWasm(SpiderOpcodes.local_get, leftTemp.ref);
                ctx.emitWasm(SpiderOpcodes.f64_eq);

                ctx.pushExpression();
                // Left is not NaN and right cannot be NaN.
                ctx.emitWasm(SpiderOpcodes.local_get, leftTemp.ref);
                ctx.emitWasm(SpiderOpcodes.local_get, rightTemp.ref);
                ctx.emitWasm(SpiderOpcodes.f64_gt);
                const trueBranch = ctx.popExpression();

                ctx.pushExpression();
                // Right is NaN and left cannot be NaN.
                ctx.emitWasm(SpiderOpcodes.local_get, leftTemp.ref);
                ctx.emitWasm(SpiderOpcodes.local_get, rightTemp.ref);
                ctx.emitWasmGetRuntime();
                ctx.emitWasmRuntimeFunctionCall("catnip_blockutil_value_cmp");
                ctx.emitWasmConst(SpiderNumberType.i32, 0);
                ctx.emitWasm(SpiderOpcodes.i32_gt_s);
                const falseBranch = ctx.popExpression();

                ctx.emitWasm(SpiderOpcodes.if, trueBranch, falseBranch, SpiderNumberType.i32);

                ctx.releaseLocal(leftTemp);
                ctx.releaseLocal(rightTemp);
            } else {
                // Neither can be NaN
                ctx.emitWasm(SpiderOpcodes.f64_gt);
            }
        } else {
            // Either of them may be a string.
            // TODO This can be optimized in the case that one of the values is def a number
            ctx.emitWasmGetRuntime();
            ctx.emitWasmRuntimeFunctionCall("catnip_blockutil_value_cmp");
            ctx.emitWasmConst(SpiderNumberType.i32, 0);
            ctx.emitWasm(SpiderOpcodes.i32_gt_s);
        }
    }
}


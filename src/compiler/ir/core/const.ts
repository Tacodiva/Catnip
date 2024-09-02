import { SpiderNumberType } from "wasm-spider";
import { CatnipCompilerWasmGenContext } from "../../../compiler/CatnipCompilerWasmGenContext";
import { CatnipIrInputOp, CatnipIrInputOpType } from "../../CatnipIrOp";
import { CatnipCompilerValue } from "../../../compiler/CatnipCompilerStack";
import { CatnipValueFormat } from "../../CatnipValueFormat";
import { CatnipValueFormatUtils } from "../../CatnipValueFormatUtils";

type const_ir_inputs = { value: string | number, format?: CatnipValueFormat };

export const ir_const = new class extends CatnipIrInputOpType<const_ir_inputs> {
    public constructor() { super("core_const"); }

    public getOperandCount(): number { return 0; }

    public getResult(inputs: const_ir_inputs): CatnipCompilerValue {
        return { isConstant: true, value: inputs.value, format: this._getFormat(inputs) };
    }

    private _getFormat(inputs: const_ir_inputs): CatnipValueFormat {
        if (inputs.format === undefined) {
            if ("" + (+inputs.value) === inputs.value) {
                return CatnipValueFormat.F64_NUMBER_OR_NAN;
            }

            return CatnipValueFormat.I32_HSTRING;
        } else {
            return inputs.format;
        }
    }

    public tryCast(ir: CatnipIrInputOp<const_ir_inputs, {}>, format: CatnipValueFormat): boolean {
        ir.inputs.format = format;
        return true;
    }

    public generateWasm(ctx: CatnipCompilerWasmGenContext, ir: CatnipIrInputOp<const_ir_inputs>): void {
        const value = ir.inputs.value;
        const format = this._getFormat(ir.inputs);

        if (CatnipValueFormatUtils.isSometimes(format, CatnipValueFormat.I32_HSTRING)) {
            ctx.emitWasmConst(SpiderNumberType.i32, ctx.alloateHeapString(""+value));
            return;
        }

        if (CatnipValueFormatUtils.isSometimes(format, CatnipValueFormat.F64_NUMBER_OR_NAN)) {
            ctx.emitWasmConst(SpiderNumberType.f64, +value);
            return;
        }

        if (CatnipValueFormatUtils.isSometimes(format, CatnipValueFormat.I32_NUMBER)) {
            ctx.emitWasmConst(SpiderNumberType.i32, +value);
            return;

        }

        throw new Error(`Unknown format for constant '${format}'`);
    }
}

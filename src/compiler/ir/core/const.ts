import { SpiderNumberType } from "wasm-spider";
import { CatnipCompilerWasmGenContext } from "../../../compiler/CatnipCompilerWasmGenContext";
import { CatnipIrInputOp, CatnipIrInputOpType } from "../../CatnipIrOp";
import { CatnipCompilerValue, CatnipCompilerValueType } from "../../../compiler/CatnipCompilerStack";
import { CatnipValueFlags, CatnipValueFormat } from "../../types";

type const_ir_inputs = { value: string, format: CatnipValueFormat, flags: CatnipValueFlags };

export const ir_const = new class extends CatnipIrInputOpType<const_ir_inputs> {
    public constructor() { super("core_const"); }

    public getOperandCount(): number { return 0; }

    public getResult(inputs: const_ir_inputs): CatnipCompilerValue {
        return { type: CatnipCompilerValueType.CONSTANT, value: inputs.value, format: this._getFormat(inputs) };
    }

    private _getFormat(inputs: const_ir_inputs): CatnipValueFormat {
        if (inputs.format === CatnipValueFormat.ANY) {
            if (""+(+inputs.value) === inputs.value) {
                return CatnipValueFormat.f64;
            }
    
            return CatnipValueFormat.HSTRING_PTR;
        } else {
            return inputs.format;
        }
    }

    public tryCast(ir: CatnipIrInputOp<const_ir_inputs, {}>, format: CatnipValueFormat, flags: CatnipValueFlags): boolean {
        ir.inputs.format = format;
        ir.inputs.flags = flags;
        return true;
    }

    public generateWasm(ctx: CatnipCompilerWasmGenContext, ir: CatnipIrInputOp<const_ir_inputs>): void {
        const value = ir.inputs.value;
        switch (this._getFormat(ir.inputs)) {
            case CatnipValueFormat.HSTRING_PTR:
                ctx.emitWasmConst(SpiderNumberType.i32, ctx.alloateHeapString(value));
                break;
            case CatnipValueFormat.i32:
                ctx.emitWasmConst(SpiderNumberType.i32, +value);
                break;
            case CatnipValueFormat.f64:
                ctx.emitWasmConst(SpiderNumberType.f64, +value);
                break;
            default:
                throw new Error(`Unsupported input format ${ir.inputs.format}`);
        }
    }
}

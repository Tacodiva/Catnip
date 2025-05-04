import { CatnipCompilerIrGenContext } from "../../compiler/CatnipCompilerIrGenContext";
import { CatnipIr } from "../../compiler/CatnipIr";
import { CatnipValueFormat } from "../../compiler/CatnipValueFormat";
import { ir_const } from "../../compiler/ir/core/const";
import { ir_div } from "../../compiler/ir/operators/div";
import { ir_abs } from "../../compiler/ir/operators/mathop/abs";
import { ir_atan } from "../../compiler/ir/operators/mathop/atan";
import { ir_ceil } from "../../compiler/ir/operators/mathop/ceil";
import { ir_cos } from "../../compiler/ir/operators/mathop/cos";
import { ir_exp } from "../../compiler/ir/operators/mathop/exp";
import { ir_floor } from "../../compiler/ir/operators/mathop/floor";
import { ir_ln } from "../../compiler/ir/operators/mathop/ln";
import { ir_sin } from "../../compiler/ir/operators/mathop/sin";
import { ir_sqrt } from "../../compiler/ir/operators/mathop/sqrt";
import { ir_tan } from "../../compiler/ir/operators/mathop/tan";
import { SB3BlockOperatorMathOp } from "../../sb3";
import { registerSB3InputBlock } from "../../sb3_ops";
import { CatnipInputOp, CatnipInputOpType, CatnipOp } from "../CatnipOp";

export type mathop_op_inputs = { value: CatnipInputOp, type: SB3BlockOperatorMathOp };

export const op_mathop = new class extends CatnipInputOpType<mathop_op_inputs> {

    public *getInputsAndSubstacks(ir: CatnipIr, inputs: mathop_op_inputs): IterableIterator<CatnipOp> {
        yield inputs.value;
    }

    public generateIr(ctx: CatnipCompilerIrGenContext, inputs: mathop_op_inputs) {
        ctx.emitInput(inputs.value, CatnipValueFormat.F64_NUMBER);

        switch (inputs.type) {
            case SB3BlockOperatorMathOp.SQRT:
                ctx.emitIr(ir_sqrt, {}, {});
                break;
            case SB3BlockOperatorMathOp.CEILING:
                ctx.emitIr(ir_ceil, {}, {});
                break;
            case SB3BlockOperatorMathOp.ABS:
                ctx.emitIr(ir_abs, {}, {});
                break;
            case SB3BlockOperatorMathOp.FLOOR:
                ctx.emitIr(ir_floor, {}, {});
                break;
            case SB3BlockOperatorMathOp.LN:
                ctx.emitIr(ir_ln, {}, {});
                break;
            case SB3BlockOperatorMathOp.LOG:
                // log(n) / log(10) = log10(n)
                ctx.emitIr(ir_ln, {}, {});
                ctx.emitIrConst(Math.LN10, CatnipValueFormat.F64_NUMBER);
                ctx.emitIr(ir_div, {}, {});
                break;
            case SB3BlockOperatorMathOp.POW_E:
                ctx.emitIr(ir_exp, {}, {});
                break;
            case SB3BlockOperatorMathOp.SIN:
                ctx.emitIr(ir_sin, {}, {});
                break;
            case SB3BlockOperatorMathOp.COS:
                ctx.emitIr(ir_cos, {}, {});
                break;
            case SB3BlockOperatorMathOp.TAN:
                ctx.emitIr(ir_tan, {}, {});
                break;
            case SB3BlockOperatorMathOp.ATAN:
                ctx.emitIr(ir_atan, {}, {});
                break;
            default:
                throw new Error(`Math operator '${inputs.type}' not supported.`);
        }
    }
}


registerSB3InputBlock("operator_mathop", (ctx, block) => op_mathop.create({
    value: ctx.readInput(block.inputs.NUM),
    type: block.fields.OPERATOR[0]
}));

import { IR0Emitter } from "../../compiler/ir0/IR0Emitter";
import { IR0Input } from "../../compiler/ir0/IR0Node";
import { IR0InputOperatorDiv } from "../../compiler/ir0/operators/IR0InputOperatorDiv";
import { IR0InputOperatorAbs } from "../../compiler/ir0/operators/mathop/IR0InputOperatorAbs";
import { IR0InputOperatorAtan } from "../../compiler/ir0/operators/mathop/IR0InputOperatorAtan";
import { IR0InputOperatorCeil } from "../../compiler/ir0/operators/mathop/IR0InputOperatorCeil";
import { IR0InputOperatorCos } from "../../compiler/ir0/operators/mathop/IR0InputOperatorCos";
import { IR0InputOperatorExp } from "../../compiler/ir0/operators/mathop/IR0InputOperatorExp";
import { IR0InputOperatorFloor } from "../../compiler/ir0/operators/mathop/IR0InputOperatorFloor";
import { IR0InputOperatorLn } from "../../compiler/ir0/operators/mathop/IR0InputOperatorLn";
import { IR0InputOperatorSin } from "../../compiler/ir0/operators/mathop/IR0InputOperatorSin";
import { IR0InputOperatorSqrt } from "../../compiler/ir0/operators/mathop/IR0InputOperatorSqrt";
import { IR0InputOperatorTan } from "../../compiler/ir0/operators/mathop/IR0InputOperatorTan";
import { SB3BlockOperatorMathOp } from "../../sb3";
import { registerSB3InputBlock } from "../../sb3_ops";
import { CatnipCommandList, CatnipInputOp, CatnipInputOpType } from "../CatnipOp";

export type mathop_op_inputs = { value: CatnipInputOp, type: SB3BlockOperatorMathOp };

export const op_mathop = new class extends CatnipInputOpType<mathop_op_inputs> {
    public *getInputsAndSubstacks(inputs: mathop_op_inputs): IterableIterator<CatnipInputOp | CatnipCommandList> {
        yield inputs.value;
    }

    public generateIr(ctx: IR0Emitter, inputs: mathop_op_inputs): IR0Input {
        const value = ctx.emitInput(inputs.value);

        switch (inputs.type) {
            case SB3BlockOperatorMathOp.SQRT:
                return new IR0InputOperatorSqrt(value);
            case SB3BlockOperatorMathOp.CEILING:
                return new IR0InputOperatorCeil(value);
            case SB3BlockOperatorMathOp.ABS:
                return new IR0InputOperatorAbs(value);
            case SB3BlockOperatorMathOp.FLOOR:
                return new IR0InputOperatorFloor(value);
            case SB3BlockOperatorMathOp.LN:
                return new IR0InputOperatorLn(value);
            case SB3BlockOperatorMathOp.LOG:
                // log(n) / log(10) = log10(n)
                return new IR0InputOperatorDiv(new IR0InputOperatorLn(value), ctx.emitConst(Math.LN10));
            case SB3BlockOperatorMathOp.POW_E:
                return new IR0InputOperatorExp(value);
            case SB3BlockOperatorMathOp.SIN:
                return new IR0InputOperatorSin(value);
            case SB3BlockOperatorMathOp.COS:
                return new IR0InputOperatorCos(value);
            case SB3BlockOperatorMathOp.TAN:
                return new IR0InputOperatorTan(value);
            case SB3BlockOperatorMathOp.ATAN:
                return new IR0InputOperatorAtan(value);
            default:
                throw new Error(`Math operator '${inputs.type}' not supported.`);
        }
    }
}


registerSB3InputBlock("operator_mathop", (ctx, block) => op_mathop.create({
    value: ctx.readInput(block.inputs.NUM),
    type: block.fields.OPERATOR[0]
}));

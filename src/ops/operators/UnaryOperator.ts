import { CatnipCompilerIrGenContext } from "../../compiler/CatnipCompilerIrGenContext";
import { CatnipIr } from "../../compiler/CatnipIr";
import { CatnipValueFormat } from "../../compiler/CatnipValueFormat";
import { CatnipInputOp, CatnipInputOpType, CatnipOp } from "../CatnipOp";

export type unary_op_inputs = { value: CatnipInputOp };
export type unary_op_ir_generator = (ctx: CatnipCompilerIrGenContext, inputs: unary_op_inputs) => void;

export class CatnipInputUnaryOpType extends CatnipInputOpType<unary_op_inputs> {
    public readonly generator: unary_op_ir_generator;

    public constructor(generator: unary_op_ir_generator) {
        super();
        this.generator = generator;
    }

    public *getInputsAndSubstacks(ir: CatnipIr, inputs: unary_op_inputs): IterableIterator<CatnipOp> {
        yield inputs.value;
    }

    public generateIr(ctx: CatnipCompilerIrGenContext, inputs: unary_op_inputs) {
        this.generator(ctx, inputs);
    }
}
import { CatnipCompilerIrGenContext } from "../../compiler/CatnipCompilerIrGenContext";
import { CatnipIr } from "../../compiler/CatnipIr";
import { CatnipValueFormat } from "../../compiler/CatnipValueFormat";
import { CatnipInputOp, CatnipInputOpType, CatnipOp } from "../CatnipOp";

export type binary_op_inputs = { left: CatnipInputOp, right: CatnipInputOp };
export type binary_op_ir_generator = (ctx: CatnipCompilerIrGenContext, inputs: binary_op_inputs) => void;

export class CatnipInputBinaryOpType extends CatnipInputOpType<binary_op_inputs> {
    public readonly generator: binary_op_ir_generator;

    public constructor(generator: binary_op_ir_generator) {
        super();
        this.generator = generator;
    }

    public *getInputsAndSubstacks(ir: CatnipIr, inputs: binary_op_inputs): IterableIterator<CatnipOp> {
        yield inputs.left;
        yield inputs.right;
    }

    public generateIr(ctx: CatnipCompilerIrGenContext, inputs: binary_op_inputs) {
        this.generator(ctx, inputs);
    }
}
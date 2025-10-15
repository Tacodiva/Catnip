import { IR0Input } from "../../compiler/ir0/IR0";
import { IR0Emitter } from "../../compiler/ir0/IR0Emitter";
import { CatnipCommandList, CatnipInputOp, CatnipInputOpType } from "../CatnipOp";

export type binary_op_inputs = { left: CatnipInputOp, right: CatnipInputOp };
export type binary_op_ir_generator = (ctx: IR0Emitter, inputs: binary_op_inputs) => IR0Input;

export class CatnipInputBinaryOpType extends CatnipInputOpType<binary_op_inputs> {
    public readonly generator: binary_op_ir_generator;

    public constructor(generator: binary_op_ir_generator) {
        super();
        this.generator = generator;
    }
    
    public *getInputsAndSubstacks(inputs: binary_op_inputs) {
        yield inputs.left;
        yield inputs.right;
    }

    public generateIr(ctx: IR0Emitter, inputs: binary_op_inputs): IR0Input {
        return this.generator(ctx, inputs);
    }
}
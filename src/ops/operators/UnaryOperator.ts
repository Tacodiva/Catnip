import { IR0Emitter } from "../../compiler/ir0/IR0Emitter";
import { IR0Input } from "../../compiler/ir0/IR0Node";
import { CatnipCommandList, CatnipInputOp, CatnipInputOpType } from "../CatnipOp";

export type unary_op_inputs = { value: CatnipInputOp };
export type unary_op_ir_generator = (ctx: IR0Emitter, value: CatnipInputOp) => IR0Input;

export class CatnipInputUnaryOpType extends CatnipInputOpType<unary_op_inputs> {
    public readonly generator: unary_op_ir_generator;

    public constructor(generator: unary_op_ir_generator) {
        super();
        this.generator = generator;
    }

    public *getInputsAndSubstacks(inputs: unary_op_inputs): IterableIterator<CatnipInputOp | CatnipCommandList> {
        yield inputs.value;
    }

    public generateIr(ctx: IR0Emitter, inputs: unary_op_inputs): IR0Input {
        return this.generator(ctx, inputs.value);
    }
}
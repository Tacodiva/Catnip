import { CatnipCommandOpType, CatnipInputOp, CatnipOp } from "..";
import { CatnipCompilerIrGenContext } from "../../compiler/CatnipCompilerIrGenContext";
import { CatnipIr } from "../../compiler/CatnipIr";
import { CatnipValueFormat } from "../../compiler/CatnipValueFormat";

type callback_command_inputs = { 
    name: string,
    inputs: [input: CatnipInputOp, format: CatnipValueFormat][]
    callback: (...args: any[]) => void | number | string
};

export const op_callback_command = new class extends CatnipCommandOpType<callback_command_inputs> {

    public *getInputsAndSubstacks(ir: CatnipIr, inputs: callback_command_inputs): IterableIterator<CatnipOp> {
        for (const subInput of inputs.inputs)
            yield subInput[0];
    }

    public generateIr(ctx: CatnipCompilerIrGenContext, inputs: callback_command_inputs): void {

        const formats: CatnipValueFormat[] = [];

        for (const subInput of inputs.inputs) {
            ctx.emitInput(subInput[0], subInput[1]);
            formats.push(subInput[1]);
        }

        ctx.emitCallback(inputs.name, inputs.callback, formats, null);
    }
}
import { CatnipCompilerIrGenContext } from "../../compiler/CatnipCompilerIrGenContext";
import { CatnipIr } from "../../compiler/CatnipIr";
import { ir_branch } from "../../compiler/ir/core/branch";
import { registerSB3CommandBlock } from "../../sb3_ops";
import { CatnipCommandList, CatnipCommandOpType, CatnipOp } from "../CatnipOp";

type forever_inputs = { loop: CatnipCommandList };

export const op_forever = new class extends CatnipCommandOpType<forever_inputs> {
    public *getInputsAndSubstacks(ir: CatnipIr, inputs: forever_inputs): IterableIterator<CatnipOp | CatnipCommandList> {
        yield inputs.loop;
    }

    public generateIr(ctx: CatnipCompilerIrGenContext, inputs: forever_inputs): void {
        ctx.emitIr(
            ir_branch, {},
            {
                branch: ctx.emitBranch((loopHead) => {
                    ctx.emitCommands(inputs.loop);
                    ctx.emitJump(loopHead);
                })
            }
        );
    }
}

registerSB3CommandBlock("control_forever", (ctx, block) => op_forever.create({
    loop: ctx.readStack(block.inputs.SUBSTACK)
}));

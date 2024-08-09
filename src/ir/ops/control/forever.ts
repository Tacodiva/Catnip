import { CatnipCompilerIrGenContext } from "../../../compiler/CatnipCompilerIrGenContext";
import { CatnipCommandList, CatnipCommandOpType } from "../../CatnipOp";
import { ir_branch } from "../core/branch";

type forever_inputs = { loop: CatnipCommandList };

export const op_forever = new class extends CatnipCommandOpType<forever_inputs> {
    public generateIr(ctx: CatnipCompilerIrGenContext, inputs: forever_inputs): void {
        ctx.emitIrCommand(
            ir_branch, {},
            {
                branch: ctx.emitBranch((loopHead) => {
                    ctx.emitCommands(inputs.loop);
                    ctx.emitJump(loopHead, false);
                })
            }
        );
    }
}
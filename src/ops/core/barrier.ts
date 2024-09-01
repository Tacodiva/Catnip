import { CatnipCompilerIrGenContext } from "../../compiler/CatnipCompilerIrGenContext";
import { ir_barrier } from "../../compiler/ir/core/barrier";
import { CatnipCommandOpType } from "../CatnipOp";

// TODO Remove
export const op_barrier = new class extends CatnipCommandOpType<{}> {
    public generateIr(ctx: CatnipCompilerIrGenContext): void {
        ctx.emitIr(ir_barrier, {}, {});
    }
}
import { CatnipCompilerIrGenContext } from "../../compiler/CatnipCompilerIrGenContext";
import { ir_log } from "../../compiler/ir/core/log";
import { CatnipValueFormat } from "../../compiler/CatnipValueFormat";
import { CatnipCommandOpType, CatnipInputOp, CatnipOp } from "../CatnipOp";
import { CatnipIr } from "../../compiler/CatnipIr";
import { CatnipIrExternalBranch } from "../../compiler/CatnipIrBranch";

type log_inputs = { msg: CatnipInputOp };

export const op_log = new class extends CatnipCommandOpType<log_inputs> {
    public *getInputsAndSubstacks(ir: CatnipIr, inputs: log_inputs): IterableIterator<CatnipOp> {
        yield inputs.msg;
    }

    public isYielding(): boolean { // TODO Get rid of this
        return true;
    }

    public generateIr(ctx: CatnipCompilerIrGenContext, inputs: log_inputs): void {
        ctx.emitInput(inputs.msg, CatnipValueFormat.I32_HSTRING);
        ctx.emitIr(ir_log, {}, {});
        ctx.emitYield();
    }
}

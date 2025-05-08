import { CatnipCompilerIrGenContext } from "../../compiler/CatnipCompilerIrGenContext";
import { ir_log } from "../../compiler/ir/core/log";
import { CatnipValueFormat } from "../../compiler/CatnipValueFormat";
import { CatnipCommandOpType, CatnipInputOp, CatnipOp } from "../CatnipOp";
import { CatnipIr } from "../../compiler/CatnipIr";
import { CatnipIrExternalBranch } from "../../compiler/CatnipIrBranch";
import { createLogger } from "../../log";

type log_inputs = { msg: CatnipInputOp, type: "log" | "warn" | "error" };

export const op_log = new class extends CatnipCommandOpType<log_inputs> {
    private readonly _logger = createLogger("CatnipBlockLog");

    public *getInputsAndSubstacks(ir: CatnipIr, inputs: log_inputs): IterableIterator<CatnipOp> {
        yield inputs.msg;
    }

    public generateIr(ctx: CatnipCompilerIrGenContext, inputs: log_inputs): void {
        ctx.emitInput(inputs.msg, CatnipValueFormat.I32_HSTRING);

        ctx.emitCallback("log_" + inputs.type, (msg: string) => {
            switch (inputs.type) {
                case "error":
                    this._logger.error(msg);
                    break;
                case "warn":
                    this._logger.warn(msg);
                    break;
                default:
                    this._logger.warn(`Unknown log type '${inputs.type}'.`);
                case "log":
                    this._logger.log(msg);
                    break;
            }
        }, [CatnipValueFormat.I32_HSTRING], null);
    }
}

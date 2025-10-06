import { CatnipCommandOpType, CatnipInputOp } from "../CatnipOp";
import { IR0Emitter } from "../../compiler/ir0/IR0Emitter";
import { IR0InstructionLog } from "../../compiler/ir0/ops/log";

type log_inputs = { msg: CatnipInputOp, type: "log" | "warn" | "error" };

export const op_log = new class extends CatnipCommandOpType<log_inputs> {
    // private readonly _logger = createLogger("CatnipBlockLog");

    public generateIr(ctx: IR0Emitter, inputs: log_inputs): void {

        // ctx.emitInput(inputs.msg, CatnipValueFormat.I32_HSTRING);

        // ctx.emitCallback("log_" + inputs.type, (msg: string) => {
        //     switch (inputs.type) {
        //         case "error":
        //             this._logger.error(msg);
        //             break;
        //         case "warn":
        //             this._logger.warn(msg);
        //             break;
        //         default:
        //             this._logger.warn(`Unknown log type '${inputs.type}'.`);
        //         case "log":
        //             this._logger.log(msg);
        //             break;
        //     }
        // }, [CatnipValueFormat.I32_HSTRING], null);

        ctx.emitInstruction(new IR0InstructionLog(
            ctx.emitInput(inputs.msg)
        ));
    }
}

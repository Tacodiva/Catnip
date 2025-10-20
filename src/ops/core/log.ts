import { CatnipValueFormat } from "../../compiler/CatnipValueFormat";
import { IR0Emitter } from "../../compiler/ir0/IR0Emitter";
import { createLogger } from "../../log";
import { CatnipCommandOpType, CatnipInputOp } from "../CatnipOp";

type log_inputs = { msg: CatnipInputOp, type: "info" | "warn" | "error" };

export const op_log = new class extends CatnipCommandOpType<log_inputs> {
    private readonly _logger = createLogger("CatnipBlockLog");
    
    private readonly callbackError = (msg: string) => this._logger.error(msg);
    private readonly callbackWarn = (msg: string) => this._logger.warn(msg);
    private readonly callbackInfo = (msg: string) => this._logger.log(msg);

    public *getInputsAndSubstacks(inputs: log_inputs) {
        yield inputs.msg;
    }

    public generateIr(ctx: IR0Emitter, inputs: log_inputs): void {

        let callback;

        switch (inputs.type) {
            case "error":
                callback = this.callbackError;
                break;
            case "warn":
                callback = this.callbackWarn;
                break;
            default:
                this._logger.warn(`Unknown log type '${inputs.type}'.`);
            case "info":
                callback = this.callbackInfo;
                break;
        }

        ctx.emitCallbackCommand("log_" + inputs.type, callback,
            { msg: { format: CatnipValueFormat.I32_HSTRING, value: ctx.emitInput(inputs.msg) } }
        );
    }
}

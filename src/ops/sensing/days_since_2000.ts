import { CatnipValueFormat } from "../../compiler/CatnipValueFormat";
import { IR0Emitter } from "../../compiler/ir0/IR0Emitter";
import { IR0Input } from "../../compiler/ir0/IR0Node";
import { registerSB3InputBlock } from "../../sb3_ops";
import { CatnipInputOpType } from "../CatnipOp";


export const op_days_since_2000 = new class extends CatnipInputOpType<{}> {
    private readonly callback = () => {
        const msPerDay = 24 * 60 * 60 * 1000;
        const start = new Date(2000, 0, 1);
        const today = new Date();
        const dstAdjust = today.getTimezoneOffset() - start.getTimezoneOffset();
        let mSecsSinceStart = today.valueOf() - start.valueOf();
        mSecsSinceStart += ((today.getTimezoneOffset() - dstAdjust) * 60 * 1000);
        return mSecsSinceStart / msPerDay;
    };

    public *getInputsAndSubstacks() { }

    public generateIr(ctx: IR0Emitter, inputs: {}): IR0Input {
        return ctx.emitCallbackInput("days since 2000", this.callback, {}, CatnipValueFormat.F64_NUMBER)
    }
}


registerSB3InputBlock("sensing_dayssince2000", (ctx, block) =>
    op_days_since_2000.create({})
);
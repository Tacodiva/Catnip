import { CatnipCompilerIrGenContext } from "../../compiler/CatnipCompilerIrGenContext";
import { CatnipValueFormat } from "../../compiler/CatnipValueFormat";
import { registerSB3InputBlock } from "../../sb3_ops";
import { CatnipInputOpType, CatnipOp } from "../CatnipOp";


export const op_days_since_2000 = new class extends CatnipInputOpType<{}> {

    public *getInputsAndSubstacks(): IterableIterator<CatnipOp> { }

    public generateIr(ctx: CatnipCompilerIrGenContext): void {
        ctx.emitCallback("days since 2000", () => {
            const msPerDay = 24 * 60 * 60 * 1000;
            const start = new Date(2000, 0, 1);
            const today = new Date();
            const dstAdjust = today.getTimezoneOffset() - start.getTimezoneOffset();
            let mSecsSinceStart = today.valueOf() - start.valueOf();
            mSecsSinceStart += ((today.getTimezoneOffset() - dstAdjust) * 60 * 1000);
            return mSecsSinceStart / msPerDay;
        }, [], CatnipValueFormat.F64);
    }
}


registerSB3InputBlock("sensing_dayssince2000", (ctx, block) => 
    op_days_since_2000.create({})
);
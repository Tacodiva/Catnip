import { CatnipValueFormat } from "../../CatnipValueFormat";
import { IR1Emitter } from "../../ir1/IR1Emitter";
import { IR1Instruction } from "../../ir1/IR1Instruction";
import { IR1InstrLooksCostumeSet } from "../../ir1/looks/IR1InstrLooksCostumeSet";
import { IR0CloneContext } from "../IR0CloneContext";
import { IR0Command, IR0Input } from "../IR0Node";

export class IR0CmdLooksCostumeSet extends IR0Command<["costume"]> {
    public constructor(costume: IR0Input) {
        super("looks_costume_set", {
            costume: {
                value: costume,
                format: CatnipValueFormat.F64 | CatnipValueFormat.I32_NUMBER | CatnipValueFormat.I32_HSTRING
            }
        });
    }

    public clone(ctx: IR0CloneContext): IR0Command<string[]> {
        return new IR0CmdLooksCostumeSet(this.args.costume.input.clone(ctx));
    }

    public emitIR1(emitter: IR1Emitter): IR1Instruction | IR1Instruction[] {
        return new IR1InstrLooksCostumeSet(this.args.costume.getResult());
    }
}
import { IR1Emitter } from "../../ir1/IR1Emitter";
import { IR0CloneContext } from "../IR0CloneContext";
import { IR0Command } from "../IR0Node";

export class IR0CmdComment extends IR0Command<[]> {

    public text: string;

    public constructor(text: string) {
        super("comment", {});
        this.text = text;
    }

    public emitIR1(emitter: IR1Emitter) { }

    public clone(ctx: IR0CloneContext) {
        return new IR0CmdComment(this.text);
    }

    public getGraphVisNodeProperties(): string {
        return `[label="${this.text}" shape=plain]`;
    }
}
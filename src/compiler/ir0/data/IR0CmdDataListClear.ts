import { CatnipList } from "../../../runtime/CatnipList";
import { CatnipTarget } from "../../../runtime/CatnipTarget";
import { IR1InstrDataListClear } from "../../ir1/data/IR1InstrDataListClear";
import { IR1Emitter } from "../../ir1/IR1Emitter";
import { IR0CloneContext } from "../IR0CloneContext";
import { IR0Command } from "../IR0Node";

export class IR0CmdDataListClear extends IR0Command<[]> {
    
    public list: CatnipList;
    public target: CatnipTarget | null;
    
    public constructor(list: CatnipList, target: CatnipTarget | null) {
        super("data_list_clear", {});
        this.list = list;
        this.target = target;
    }
    
    public clone(ctx: IR0CloneContext): IR0Command<[]> {
        return new IR0CmdDataListClear(this.list, this.target);
    }

    public emitIR1(emitter: IR1Emitter): void {
        emitter.emitIR1(new IR1InstrDataListClear(this.list, this.target));
    }

    public getGraphVisNodeProperties(): string {
        return `[label="${this.name} '${this.list.name}'"]`;
    }
}
import { CatnipList } from "../../../runtime/CatnipList";
import { CatnipTarget } from "../../../runtime/CatnipTarget";
import { CatnipValueFormat } from "../../CatnipValueFormat";
import { IR1InstrDataListPushItem } from "../../ir1/data/IR1InstrDataListPushItem";
import { IR1Emitter } from "../../ir1/IR1Emitter";
import { IR1Instruction } from "../../ir1/IR1Instruction";
import { IR0CloneContext } from "../IR0CloneContext";
import { IR0Command, IR0Input } from "../IR0Node";

export class IR0CmdDataListPushItem extends IR0Command<["item"]> {
    public list: CatnipList;
    public target: CatnipTarget | null;

    public constructor(list: CatnipList, target: CatnipTarget | null, item: IR0Input) {
        super("data_list_push_item", {
            item: {
                value: item,
                format: CatnipValueFormat.F64
            }
        });
        this.list = list;
        this.target = target;
    }

    public clone(ctx: IR0CloneContext) {
        return new IR0CmdDataListPushItem(this.list, this.target, this.args.item.input.clone(ctx));
    }

    public emitIR1(emitter: IR1Emitter): IR1Instruction | IR1Instruction[] {
        return new IR1InstrDataListPushItem(this.list, this.target);
    }

    public getGraphVisNodeProperties(): string {
        return `[label="${this.name} '${this.list.name}'"]`;
    }
}
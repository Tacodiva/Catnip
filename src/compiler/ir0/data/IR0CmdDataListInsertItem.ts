import { CatnipList } from "../../../runtime/CatnipList";
import { CatnipTarget } from "../../../runtime/CatnipTarget";
import { CatnipValueFormat } from "../../CatnipValueFormat";
import { IR1InstrDataListInsertItem } from "../../ir1/data/IR1InstrDataListInsertItem";
import { IR1Emitter } from "../../ir1/IR1Emitter";
import { IR0CloneContext } from "../IR0CloneContext";
import { IR0Command, IR0Input } from "../IR0Node";

export class IR0CmdDataListInsertItem extends IR0Command<["index", "item"]> {
    public list: CatnipList;
    public target: CatnipTarget | null;

    public constructor(list: CatnipList, target: CatnipTarget | null, index: IR0Input, item: IR0Input) {
        super("data_list_insert_item", {
            index: {
                value: index,
                format: CatnipValueFormat.F64 | CatnipValueFormat.I32_NUMBER
            },
            item: {
                value: item,
                format: CatnipValueFormat.F64
            }
        });
        this.list = list;
        this.target = target;
    }

    public clone(ctx: IR0CloneContext) {
        return new IR0CmdDataListInsertItem(this.list, this.target, this.args.index.input.clone(ctx), this.args.item.input.clone(ctx));
    }

    public emitIR1(emitter: IR1Emitter): void {
        emitter.emitInput(this.args.index);
        emitter.emitInput(this.args.item);
        emitter.emitIR1(new IR1InstrDataListInsertItem(this.list, this.target, this.args.index.getResult()));
    }

    public getGraphVisNodeProperties(): string {
        return `[label="${this.name} '${this.list.name}'"]`;
    }
}
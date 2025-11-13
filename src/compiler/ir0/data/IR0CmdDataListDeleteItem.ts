import { CatnipList } from "../../../runtime/CatnipList";
import { CatnipTarget } from "../../../runtime/CatnipTarget";
import { CatnipValueFormat } from "../../CatnipValueFormat";
import { IR1InstrDataListDeleteItem } from '../../ir1/data/IR1InstrDataListDeleteItem';
import { IR1Emitter } from "../../ir1/IR1Emitter";
import { IR0CloneContext } from "../IR0CloneContext";
import { IR0Command, IR0Input } from "../IR0Node";

export class IR0CmdDataListDeleteItem extends IR0Command<["index"]> {
    public list: CatnipList;
    public target: CatnipTarget | null;

    public constructor(list: CatnipList, target: CatnipTarget | null, index: IR0Input) {
        super("data_list_delete_item", {
            index: {
                value: index,
                format: CatnipValueFormat.F64 | CatnipValueFormat.I32_NUMBER
            }
        });
        this.list = list;
        this.target = target;
    }

    public clone(ctx: IR0CloneContext): IR0Command<["index"]> {
        return new IR0CmdDataListDeleteItem(this.list, this.target, this.args.index.input.clone(ctx));
    }

    public emitIR1(emitter: IR1Emitter): void {
        emitter.emitInput(this.args.index);
        emitter.emitIR1(new IR1InstrDataListDeleteItem(this.list, this.target, this.args.index.getResult()));
    }

    public getGraphVisNodeProperties(): string {
        return `[label="${this.name} '${this.list.name}'"]`;
    }
}
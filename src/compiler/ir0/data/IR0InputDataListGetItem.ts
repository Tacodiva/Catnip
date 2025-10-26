import { CatnipList } from "../../../runtime/CatnipList";
import { CatnipTarget } from "../../../runtime/CatnipTarget";
import { CatnipValue } from "../../CatnipValue";
import { CatnipValueFormat } from "../../CatnipValueFormat";
import { IR1InstrDataListGetItem } from "../../ir1/data/IR1InstrDataListGetItem";
import { IR1Emitter } from "../../ir1/IR1Emitter";
import { IR1Instruction } from "../../ir1/IR1Instruction";
import { IR0CloneContext } from "../IR0CloneContext";
import { IR0Input } from "../IR0Node";

export class IR0InputDataListGetItem extends IR0Input<["index"]> {

    public list: CatnipList;
    public target: CatnipTarget | null;

    public constructor(list: CatnipList, target: CatnipTarget | null, index: IR0Input) {
        super("data_list_get_item", {
            index: {
                value: index,
                format: CatnipValueFormat.F64 | CatnipValueFormat.I32_NUMBER
            }
        });
        this.list = list;
        this.target = target;
    }

    public getResult(): CatnipValue {
        return CatnipValue.dynamic(CatnipValueFormat.F64);
    }

    public clone(ctx: IR0CloneContext): IR0Input<string[]> {
        return new IR0InputDataListGetItem(this.list, this.target, this.args.index.input.clone(ctx));
    }

    public emitIR1(emitter: IR1Emitter): IR1Instruction | IR1Instruction[] {
        return new IR1InstrDataListGetItem(this.list, this.target, this.args.index.getResult());
    }

    public getGraphVisNodeProperties(): string {
        return `[label="${this.name} '${this.list.name}'"]`;
    }
}
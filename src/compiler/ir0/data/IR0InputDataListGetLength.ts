import { CatnipList } from "../../../runtime/CatnipList";
import { CatnipTarget } from "../../../runtime/CatnipTarget";
import { CatnipValue } from "../../CatnipValue";
import { CatnipValueFormat } from "../../CatnipValueFormat";
import { IR1InstrDataListGetLength } from "../../ir1/data/IR1InstrDataListGetLength";
import { IR1Emitter } from "../../ir1/IR1Emitter";
import { IR0CloneContext } from "../IR0CloneContext";
import { IR0Input } from "../IR0Node";

export class IR0InputDataListGetLength extends IR0Input<[]> {

    public list: CatnipList;
    public target: CatnipTarget | null;

    public constructor(list: CatnipList, target: CatnipTarget | null) {
        super("data_list_get_length", {});
        this.list = list;
        this.target = target;
    }

    public getResult(): CatnipValue {
        return CatnipValue.dynamic(CatnipValueFormat.I32_NUMBER);
    }

    public clone(ctx: IR0CloneContext): IR0Input<string[]> {
        return new IR0InputDataListGetLength(this.list, this.target);
    }

    public emitIR1(emitter: IR1Emitter): void {
        emitter.emitIR1(new IR1InstrDataListGetLength(this.list, this.target));
    }

    public getGraphVisNodeProperties(): string {
        return `[label="${this.name} '${this.list.name}'"]`;
    }
}
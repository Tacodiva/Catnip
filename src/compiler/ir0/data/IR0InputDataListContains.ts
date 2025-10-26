
import { CatnipList } from "../../../runtime/CatnipList";
import { CatnipTarget } from "../../../runtime/CatnipTarget";
import { CatnipValue } from "../../CatnipValue";
import { CatnipValueFormat } from "../../CatnipValueFormat";
import { IR1InstrCast } from "../../ir1/core/IR1InstrCast";
import { IR1InstrDataListIndexOf } from "../../ir1/data/IR1InstrDataListIndexOf";
import { IR1Emitter } from "../../ir1/IR1Emitter";
import { IR0CloneContext } from "../IR0CloneContext";
import { IR0Input } from "../IR0Node";

export class IR0InputDataListContains extends IR0Input<["item"]> {

    public list: CatnipList;
    public target: CatnipTarget | null;

    public constructor(list: CatnipList, target: CatnipTarget | null, item: IR0Input) {
        super("data_list_contains", {
            item: {
                value: item,
                format: CatnipValueFormat.F64
            }
        });
        this.list = list;
        this.target = target;
    }

    public getResult(): CatnipValue {
        return CatnipValue.dynamic(CatnipValueFormat.I32_BOOLEAN);
    }

    public clone(ctx: IR0CloneContext): IR0Input<string[]> {
        return new IR0InputDataListContains(this.list, this.target, this.args.item.input.clone(ctx));
    }

    public emitIR1(emitter: IR1Emitter) {
        return [
            new IR1InstrDataListIndexOf(this.list, this.target),
            new IR1InstrCast(CatnipValueFormat.I32_NUMBER, CatnipValueFormat.I32_BOOLEAN)
        ];
    }

    public getGraphVisNodeProperties(): string {
        return `[label="${this.name} '${this.list.name}'"]`;
    }
}
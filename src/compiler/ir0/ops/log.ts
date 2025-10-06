import { catnip_compiler_constant } from "../../cast";
import { IR0Input, IR0Instruction } from "../IR0";
import { IR0Trigger } from "../IR0Trigger";

export class IR0InstructionLog extends IR0Instruction<["msg"]> {

    public constructor(value: IR0Input) {
        super("log", {
            msg: { value }
        });
    }

}

export class IR0InputConst extends IR0Input<[]> {

    public value: catnip_compiler_constant;

    public constructor(value: catnip_compiler_constant) {
        super("const", {});
        this.value = value;
    }

    public getGraphVisNodeProperties(): string {
        return `[label="${this.value}" shape=plain]`;
    }

}


export class IR0InputJoin extends IR0Input<["left", "right"]> {

    public constructor(left: IR0Input, right: IR0Input) {
        super("join", { left: { value: left }, right: { value: right } });
    }

}

export class IR0TriggerEvent extends IR0Trigger {
    public name: string = "Green Flag";
    public isWarp: boolean = false;
}
import { catnip_compiler_constant } from "../../cast";
import { IR1InstrConst, IR1InstrJoin, IR1InstrLog } from "../../ir1/instructions/blah";
import { IR1Emitter } from "../../ir1/IR1Emitter";
import { IR0Input, IR0Command } from "../IR0";
import { IR0Trigger } from "../IR0Trigger";

export class IR0CmdLog extends IR0Command<["msg"]> {

    public constructor(value: IR0Input) {
        super("log", {
            msg: { value }
        });
    }

    public emitIR1(emitter: IR1Emitter) {
        return new IR1InstrLog();
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
    
    public emitIR1(emitter: IR1Emitter) {
        return new IR1InstrConst(this.value);
    }
}


export class IR0InputJoin extends IR0Input<["left", "right"]> {

    public constructor(left: IR0Input, right: IR0Input) {
        super("join", { left: { value: left }, right: { value: right } });
    }

    public emitIR1(emitter: IR1Emitter) {
        return new IR1InstrJoin();
    }
}

export class IR0TriggerEvent extends IR0Trigger {
    public name: string = "Green Flag";
    public isWarp: boolean = false;
}
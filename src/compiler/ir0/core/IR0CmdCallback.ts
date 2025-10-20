import { IR1InstrCallback } from "../../ir1/core/IR1InstrCallback";
import { IR1Emitter } from "../../ir1/IR1Emitter";
import { catnip_compiler_callback } from "../../wasm/CatnipCompilerWasmModule";
import { IR0Command, IR0NodeArgument, IR0NodeArguments } from "../IR0Node";
import { IR0GraphVisDotGenerator } from "../IR0GraphVisDotGenerator";

export class IR0CmdCallback extends IR0Command {
    public readonly callback: catnip_compiler_callback;
    public readonly name: string;

    public constructor(name: string, callback: catnip_compiler_callback, args: IR0NodeArguments<IR0NodeArgument>) {
        super("callback", args);
        this.name = name;
        this.callback = callback;
    }

    public getGraphVisNodeProperties(): string {
        return `[label="callback '${this.name}'"]`;
    }

    public emitIR1(emitter: IR1Emitter) {
        return new IR1InstrCallback(
            this.name, this.callback,
            Object.values(this.args).map(arg => arg.requiredFormat), null
        );
    }
}
import { IR1InstrCallback } from "../../ir1/core/IR1InstrCallback";
import { IR1Emitter } from "../../ir1/IR1Emitter";
import { catnip_compiler_callback } from "../../wasm/CatnipCompilerWasmModule";
import { IR0CloneContext } from "../IR0CloneContext";
import { IR0Command, IR0NodeArgument, IR0NodeArguments } from "../IR0Node";

export class IR0CmdCallback extends IR0Command<string[]> {
    public readonly callback: catnip_compiler_callback;
    public readonly name: string;

    public constructor(name: string, callback: catnip_compiler_callback, args: IR0NodeArguments<IR0NodeArgument>) {
        super("callback_cmd", args);
        this.name = name;
        this.callback = callback;
    }

    public getGraphVisNodeProperties(): string {
        return `[label="callback '${this.name}'"]`;
    }

    public emitIR1(emitter: IR1Emitter) {
        emitter.emitInputs(this.args);
        emitter.emitIR1(new IR1InstrCallback(
            this.name, this.callback,
            Object.values(this.args).map(arg => arg.requiredFormat), null
        ));
    }

    public clone(ctx: IR0CloneContext) {
        const args: IR0NodeArguments<IR0NodeArgument> = {};

        for (const arg of Object.values(this.args)) {
            args[arg.name] = {
                value: arg.input.clone(ctx),
                format: arg.requiredFormat
            };
        }

        return new IR0CmdCallback(this.name, this.callback, args);
    }
}
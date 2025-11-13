import { CatnipValue } from "../../CatnipValue";
import { CatnipValueFormat } from "../../CatnipValueFormat";
import { IR1InstrCallback } from "../../ir1/core/IR1InstrCallback";
import { IR1Emitter } from "../../ir1/IR1Emitter";
import { catnip_compiler_callback } from "../../wasm/CatnipCompilerWasmModule";
import { IR0CloneContext } from "../IR0CloneContext";
import { IR0Input, IR0NodeArgument, IR0NodeArguments } from "../IR0Node";

export class IR0InputCallback extends IR0Input<string[]> {
    public readonly callback: catnip_compiler_callback;
    public readonly name: string;
    public readonly result: CatnipValueFormat;
    
    public constructor(name: string, callback: catnip_compiler_callback, args: IR0NodeArguments<IR0NodeArgument>, result: CatnipValueFormat) {
        super("callback_input", args);
        this.name = name;
        this.callback = callback;
        this.result = result;
    }

    public getResult(): CatnipValue {
        return CatnipValue.dynamic(this.result);
    }

    public getGraphVisNodeProperties(): string {
        return `[label="callback '${this.name}'"]`;
    }

    public emitIR1(emitter: IR1Emitter) {
        emitter.emitInputs(this.args);
        emitter.emitIR1(new IR1InstrCallback(
            this.name, this.callback,
            Object.values(this.args).map(arg => arg.requiredFormat),
            this.result
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

        return new IR0InputCallback(this.name, this.callback, args, this.result);
    }
}
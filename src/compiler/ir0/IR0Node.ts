import { CatnipValueFormat } from "../CatnipValueFormat";
import { IR1Instruction } from "../ir1/IR1Instruction";
import { IR1Emitter } from "../ir1/IR1Emitter";
import { IR1ExternalValue } from "../ir1/IR1ExternalValue";
import { IR0GraphVisDotGenerator } from "./IR0GraphVisDotGenerator";
import { CatnipValue } from "../CatnipValue";
import { IR1InstrCast } from "../ir1/core/IR1InstrCast";

interface IR0InstructionArgument {
    value: IR0Input;
    readonly format: CatnipValueFormat;
}

export type IR0InstructionArguments<TArgs extends string[] = string[]> = {
    [K in TArgs[number]]: IR0InstructionArgument;
}

export abstract class IR0Node<TArgs extends string[] = string[]> {
    public readonly name: string;

    public readonly args: Readonly<IR0InstructionArguments<TArgs>>;

    constructor(name: string, args: IR0InstructionArguments<TArgs>) {
        this.name = name;
        this.args = args;
    }

    public createGraphVisNode(generator: IR0GraphVisDotGenerator): string {
        const nodeName = generator.getName();
        generator.writeLine(`${nodeName} ${this.getGraphVisNodeProperties()}`);

        for (const argName of Object.keys(this.args)) {
            const arg = (this.args as Record<string, IR0InstructionArgument>)[argName];
            const argNodeName = arg.value.createGraphVisNode(generator);

            generator.writeValueEdge(argNodeName, nodeName, argName);
        }
        return nodeName;
    }

    protected getInputResult(input: TArgs[number]): CatnipValue {
        const arg = this.args[input];

        arg.value.requestResultFormat(arg.format);
        const result = arg.value.getResult();

        if (result.isAlwaysFormat(arg.format))
            return result;

        return result.castTo(IR1InstrCast.emitConversion(null, result.format, arg.format));
    }

    public getGraphVisNodeProperties(): string {
        return `[label="${this.name}"]`;
    }

    public getExternalValues(): IR1ExternalValue[] {
        return [];
    }

    public abstract emitIR1(emitter: IR1Emitter): IR1Instruction | IR1Instruction[];

}

export abstract class IR0Command<TArgs extends string[] = string[]> extends IR0Node<TArgs> {

}

// Inputs must not have side effects
export abstract class IR0Input<TArgs extends string[] = string[]> extends IR0Node<TArgs> {

    public abstract getResult(): CatnipValue;

    public requestResultFormat(dest: CatnipValueFormat): void {
    }
}
import { CatnipValueFormat } from "../CatnipValueFormat";
import { IR1Instruction } from "../ir1/IR1Instruction";
import { IR1Emitter } from "../ir1/IR1Emitter";
import { IR1ExternalValue } from "../ir1/IR1ExternalValue";
import { IR0GraphVisDotGenerator } from "./IR0GraphVisDotGenerator";
import { CatnipValue } from "../CatnipValue";
import { IR1InstrCast } from "../ir1/core/IR1InstrCast";

export class IR0InputReference {
    public readonly name: string;
    public readonly requiredFormat: CatnipValueFormat;
    public input: IR0Input;

    public constructor(name: string, format: CatnipValueFormat, input: IR0Input) {
        this.name = name;
        this.requiredFormat = format;
        this.input = input;
    }

    public getResult(): CatnipValue {
        this.input.requestResultFormat(this.requiredFormat);
        const result = this.input.getResult();

        if (result.isAlwaysFormat(this.requiredFormat))
            return result;

        return result.castTo(IR1InstrCast.emitConversion(null, result.format, this.requiredFormat));
    }
}

export interface IR0NodeArgument {
    value: IR0Input;
    readonly format: CatnipValueFormat;
}

export type IR0ParameterName<TParams extends string[] = string[]> = TParams[number];

export type IR0NodeArguments<TValue, TParams extends string[] = string[]> = {
    [K in IR0ParameterName<TParams>]: TValue;
}

export abstract class IR0Node<TParams extends string[] = string[]> {
    public readonly name: string;

    public readonly args: Readonly<IR0NodeArguments<IR0InputReference, TParams>>;

    constructor(name: string, args: IR0NodeArguments<IR0NodeArgument, TParams>) {
        this.name = name;
        
        const argReferences: Partial<IR0NodeArguments<IR0InputReference, TParams>> = {};

        for (const paramName of Object.keys(args)) {
            const paramNameCast = paramName as IR0ParameterName<TParams>;
            const argument = args[paramNameCast];
            argReferences[paramNameCast] = new IR0InputReference(paramName, argument.format, argument.value);
        }

        this.args = argReferences as IR0NodeArguments<IR0InputReference, TParams>;
    }

    public createGraphVisNode(generator: IR0GraphVisDotGenerator): string {
        const nodeName = generator.getName();
        generator.writeLine(`${nodeName} ${this.getGraphVisNodeProperties()}`);

        for (const argName of Object.keys(this.args)) {
            const arg = this.args[argName as IR0ParameterName<TParams>];
            const argNodeName = arg.input.createGraphVisNode(generator);

            generator.writeValueEdge(argNodeName, nodeName, argName);
        }
        return nodeName;
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
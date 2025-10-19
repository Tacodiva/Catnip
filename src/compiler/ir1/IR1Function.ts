import { CatnipCompilerStage } from "../CatnipCompilerStage";
import { IR1Instruction } from "./IR1Instruction";
import { IR1Script } from "./IR1Script";
import { IR1StringificationContext } from "./IR1StringificationContext";
import { IR1ExternalValue, IR1ExternalValueType } from "./IR1ExternalValue";
import { CatnipCompilerTransientVariable } from "../CatnipCompilerTransientVariable";

export enum IR1ExternalValueSourceType {
    STACK,
    PARAMETERS
}

export interface IR1FunctionExternalValue {
    source: IR1ExternalValueSourceType;
    value: IR1ExternalValue;
}

export class IR1Function {
    public readonly script: IR1Script;
    private _body: IR1Instruction[] | null;

    private _externalValues: IR1ExternalValue[];

    public get externalValues(): readonly IR1ExternalValue[] { return this._externalValues; }
    public externalValueSource: IR1ExternalValueSourceType;

    public createdTransients: CatnipCompilerTransientVariable[];

    public get body(): IR1Instruction[] {
        if (this._body === null) throw new Error("Body not generated yet.");
        return this._body;
    }

    public set body(value: IR1Instruction[]) {
        if (this._body !== null) throw new Error("Body already generated.");
        this._body = value;
    }

    public constructor(script: IR1Script) {
        this.script = script;
        this._body = null;

        this._externalValues = [];
        this.externalValueSource = IR1ExternalValueSourceType.PARAMETERS;

        this.createdTransients = [];

        this.script.functions.push(this);
    }

    public addExternalValue(value: IR1ExternalValue) {
        this.script.ir.compiler.assertStageBefore(CatnipCompilerStage.IR0_IR1_GEN);
        this._externalValues.push(value);

        // We need to make sure the procedure arguments are in order
        this._externalValues.sort((a, b) => {
            if (a.type !== IR1ExternalValueType.PROCEDURE_ARGUMENT || b.type !== IR1ExternalValueType.PROCEDURE_ARGUMENT)
                return 0;

            return a.index - b.index;
        });
    }

    public stringify(ctx: IR1StringificationContext): void {

        const funcName = ctx.getFunctionName(this);

        if (this.externalValues.length !== 0) {
            ctx.writeLine(`${funcName} externals from ${IR1ExternalValueSourceType[this.externalValueSource]}`);

            for (const external of this.externalValues) {
                ctx.writeLine(`${funcName} external ${IR1ExternalValue.stringify(external)}`);
            }
        }

        for (const createdTransient of this.createdTransients) {
            ctx.writeLine(`${funcName} creates transient '${createdTransient.name}'`);
        }

        if (this._body === null) {
            ctx.writeLine(`${funcName} not generated`);
        } else {
            ctx.openBlock(funcName);
            ctx.writeInstructions(this._body);
            ctx.closeBlock();
        }
        ctx.writeLine();
    }
}

import { CatnipCompilerStage } from "../CatnipCompilerStage";
import { IR1Script, IR1Instruction, IR1StringificationContext } from "./IR1";
import { IR1ExternalValue, IR1ExternalValueType } from "./IR1ExternalValue";

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
                switch (external.type) {
                    case IR1ExternalValueType.PROCEDURE_ARGUMENT:
                        ctx.writeLine(`${funcName} external procedure argument #${external.index}`);
                        break;
                    case IR1ExternalValueType.RETURN_LOCATION:
                        ctx.writeLine(`${funcName} external return location`);
                        break;
                }
            }
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

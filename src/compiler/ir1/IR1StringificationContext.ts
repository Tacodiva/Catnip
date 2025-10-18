import { IR1Instruction } from "./IR1Instruction";
import { IR1Function } from "./IR1Function";


export class IR1StringificationContext {

    public code: string;
    public indentation: number;

    public functionNames: Map<IR1Function, string>;
    private _functionNameIdx: number;

    public constructor() {
        this.code = "";
        this.indentation = 0;

        this.functionNames = new Map();
        this._functionNameIdx = 0;
    }

    public getFunctionName(func: IR1Function) {
        let name = this.functionNames.get(func);
        if (name) return name;
        name = "func" + (this._functionNameIdx++);
        this.functionNames.set(func, name);
        return name;
    }

    public indent() {
        for (let i = 0; i < this.indentation; i++) this.code += "  ";
    }

    public writeLine(line?: string) {
        if (line) {
            this.indent();
            this.code += line;
        }
        this.code += "\n";
    }

    public openBlock(line: string) {
        this.writeLine(line + " {");
        ++this.indentation;
    }

    public closeBlock() {
        --this.indentation;
        this.writeLine("}");
    }

    public writeInstructions(instrs: IR1Instruction[]) {
        for (const instr of instrs) {
            instr.stringify(this);
        }
    }

    public toString() {
        return this.code;
    }
}

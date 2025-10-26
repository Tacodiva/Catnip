import { SpiderOpcodes } from "wasm-spider";
import { CatnipCompilerWasmEmitter } from "../../wasm/CatnipCompilerWasmEmitter";
import { IR1Instruction } from "../IR1Instruction";
import { IR1StringificationContext } from "../IR1StringificationContext";


export class IR1InstrIf extends IR1Instruction {

    public pass: IR1Instruction[];
    public fail: IR1Instruction[];

    public constructor(pass: IR1Instruction[], fail: IR1Instruction[]) {
        super();
        this.pass = pass;
        this.fail = fail;
    }

    public emitWasm(emitter: CatnipCompilerWasmEmitter): void {
        if (this.fail.length === 0) {
            emitter.emitWasmIf(this.pass);
        } else {
            emitter.emitWasmIf(this.pass, this.fail);
        }
    }

    public stringify(ctx: IR1StringificationContext): void {
        ctx.openBlock("if");
        ctx.writeInstructions(this.pass);
        ctx.closeBlock();

        if (this.fail.length !== 0) {
            ctx.openBlock("else");
            ctx.writeInstructions(this.fail);
            ctx.closeBlock();
        }
    }
}

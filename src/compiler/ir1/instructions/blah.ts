import { SpiderNumberType, SpiderOpcodes } from "wasm-spider";
import { CatnipWasmEnumThreadStatus } from "../../../wasm-interop/CatnipWasmEnumThreadStatus";
import { CatnipCompilerWasmEmitter } from "../../wasm/CatnipCompilerWasmEmitter";
import { IR1Function, IR1Instruction, IR1StringificationContext } from "../IR1";
import { CatnipValueFormat } from "../../CatnipValueFormat";
import { CatnipWasmStructThread } from "../../../wasm-interop/CatnipWasmStructThread";


export class IR1InstrBlock extends IR1Instruction {

    public body: IR1Instruction[];

    public constructor(body?: IR1Instruction[]) {
        super();
        this.body = body ?? [];
    }

    public emitWasm(emitter: CatnipCompilerWasmEmitter): void {
        emitter.emitWasm(SpiderOpcodes.block, emitter.emitExpression(this.body));
    }

    public stringify(ctx: IR1StringificationContext): void {
        ctx.openBlock("block");
        ctx.writeInstructions(this.body);
        ctx.closeBlock();
    }
}

export class IR1InstrLoop extends IR1Instruction {

    public body: IR1Instruction[];

    public constructor(body?: IR1Instruction[]) {
        super();
        this.body = body ?? [];
    }

    public emitWasm(emitter: CatnipCompilerWasmEmitter): void {
        emitter.emitWasm(SpiderOpcodes.loop, emitter.emitExpression(this.body));
    }

    public stringify(ctx: IR1StringificationContext): void {
        ctx.openBlock("loop");
        ctx.writeInstructions(this.body);
        ctx.closeBlock();
    }
}

export class IR1InstrBr extends IR1Instruction {

    public index: number;

    public constructor(index: number) {
        super();
        this.index = index;
    }

    public emitWasm(emitter: CatnipCompilerWasmEmitter): void {
        emitter.emitWasm(SpiderOpcodes.br, this.index);
    }

    public stringify(ctx: IR1StringificationContext): void {
        ctx.writeLine(`br ${this.index}`);
    }
}

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
            emitter.emitWasm(SpiderOpcodes.if, emitter.emitExpression(this.pass));
        } else {
            emitter.emitWasm(SpiderOpcodes.if, emitter.emitExpression(this.pass), emitter.emitExpression(this.fail));
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

export class IR1InstrReturn extends IR1Instruction {
    public emitWasm(emitter: CatnipCompilerWasmEmitter): void {
        emitter.emitWasm(SpiderOpcodes.return);
    }

    public stringify(ctx: IR1StringificationContext): void {
        ctx.writeLine(`return`);
    }
}

export class IR1InstrTerminate extends IR1Instruction {
    public emitWasm(emitter: CatnipCompilerWasmEmitter): void {
        emitter.emitWasmPushThread();
        emitter.emitWasmPushNumber(SpiderNumberType.i32, CatnipWasmEnumThreadStatus.TERMINATED);
        emitter.emitWasm(SpiderOpcodes.i32_store, 2, CatnipWasmStructThread.getMemberOffset("status"));

        // emitter.cleanStack();
        emitter.emitWasm(SpiderOpcodes.return);
    }

    public stringify(ctx: IR1StringificationContext): void {
        ctx.writeLine(`terminate`);
    }
}

export class IR1InstrCall extends IR1Instruction {

    public func: IR1Function;

    public emitWasm(emitter: CatnipCompilerWasmEmitter): void {
        emitter.emitWasm(SpiderOpcodes.call, emitter.prepass.getSpiderFunction(this.func));
    }

    public constructor(func: IR1Function) {
        super();
        this.func = func;
    }

    public stringify(ctx: IR1StringificationContext): void {
        ctx.writeLine(`call ${ctx.getFunctionName(this.func)}`);
    }
}

export class IR1InstrYield extends IR1Instruction {

    public func: IR1Function;
    public status: CatnipWasmEnumThreadStatus;

    public constructor(func: IR1Function, status: CatnipWasmEnumThreadStatus) {
        super();
        this.func = func;
        this.status = status;
    }

    public emitWasm(emitter: CatnipCompilerWasmEmitter): void {
        throw new Error("Not implemented.");
    }

    public stringify(ctx: IR1StringificationContext): void {
        ctx.writeLine(`yield ${ctx.getFunctionName(this.func)} status = ${this.status}`);
    }

}


export class IR1InstrLog extends IR1Instruction {
    
    public constructor() {
        super();
    }

    public emitWasm(emitter: CatnipCompilerWasmEmitter): void {
        emitter.emitWasm(SpiderOpcodes.call,
            emitter.module.importCallback("log",
                console.log,
                [CatnipValueFormat.I32_HSTRING], null
            )
        );
    }

    public stringify(ctx: IR1StringificationContext): void {
        ctx.writeLine(`log`);
    }
}

export class IR1InstrJoin extends IR1Instruction {
    
    public constructor() {
        super();
    }

    public emitWasm(emitter: CatnipCompilerWasmEmitter): void {
        emitter.emitWasmPushRuntime();
        emitter.emitWasmRuntimeFunctionCall("catnip_blockutil_hstring_join");
    }

    public stringify(ctx: IR1StringificationContext): void {
        ctx.writeLine(`join`);
    }
}


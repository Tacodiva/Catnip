import { CatnipWasmEnumThreadStatus } from "../../../wasm-interop/CatnipWasmEnumThreadStatus";
import { catnip_compiler_constant } from "../../cast";
import { IR1Function, IR1Instruction, IR1StringificationContext } from "../IR1";


export class IR1InstrBlock extends IR1Instruction {

    public body: IR1Instruction[];

    public constructor(body?: IR1Instruction[]) {
        super();
        this.body = body ?? [];
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
    public stringify(ctx: IR1StringificationContext): void {
        ctx.writeLine(`return`);
    }
}

export class IR1InstrCall extends IR1Instruction {

    public func: IR1Function;

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

    public stringify(ctx: IR1StringificationContext): void {
        ctx.writeLine(`yield ${ctx.getFunctionName(this.func)} status = ${this.status}`);
    }

}


export class IR1InstrConst extends IR1Instruction {

    public value: catnip_compiler_constant;

    public constructor(value: catnip_compiler_constant) {
        super();
        this.value = value;
    }

    public stringify(ctx: IR1StringificationContext): void {
        ctx.writeLine(`const ${JSON.stringify(this.value)}`);
    }

}

export class IR1InstrLog extends IR1Instruction {

    public constructor() {
        super();
    }

    public stringify(ctx: IR1StringificationContext): void {
        ctx.writeLine(`log`);
    }
}

export class IR1InstrJoin extends IR1Instruction {

    public constructor() {
        super();
    }

    public stringify(ctx: IR1StringificationContext): void {
        ctx.writeLine(`join`);
    }
}
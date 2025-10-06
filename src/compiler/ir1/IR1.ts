import { CatnipSpriteID } from "../../runtime/CatnipSprite";
import { CatnipCompiler } from "../CatnipCompiler";
import { IR0 } from "../ir0/IR0";
import { IR1Logger } from "./IR1Logger";

export class IR1 {

    public readonly compiler: CatnipCompiler;
    public readonly scripts: IR1Script[];

    public constructor(compiler: CatnipCompiler) {
        this.compiler = compiler;
        
        this.scripts = [];
    }
}

export class IR1Script {
    public readonly ir: IR1;
    public readonly spriteID: CatnipSpriteID;

    public entrypoint: IR1Function;
    public functions: IR1Function[];

    public constructor(ir: IR1, spriteID: CatnipSpriteID) {
        this.ir = ir;
        this.spriteID = spriteID;
        this.functions = [];
        this.entrypoint = new IR1Function(this);

        this.ir.scripts.push(this);
    }
}

export class IR1Function {
    public readonly script: IR1Script;

    public constructor(script: IR1Script) {
        this.script = script;

        this.script.functions.push(this);
    }
}



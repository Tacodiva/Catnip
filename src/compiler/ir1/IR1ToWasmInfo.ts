import { SpiderFunctionDefinition } from "wasm-spider";
import { IR1, IR1Function } from "./IR1";
import { CatnipCompilerWasmModule } from "../wasm/CatnipCompilerWasmModule";
import { IR1Logger } from "./IR1Logger";

export class IR1ToWasmInfo {

    public readonly ir1: IR1;
    public readonly module: CatnipCompilerWasmModule;

    public get spiderModule() { return this.module.spiderModule; }
    public get compiler() { return this.module.compiler; }

    private readonly _functions: Map<IR1Function, SpiderFunctionDefinition>;

    public constructor(ir1: IR1, module: CatnipCompilerWasmModule) {
        this.ir1 = ir1;
        this.module = module;

        this._functions = new Map();

        // Premake all the functions so they can reference eachother
        for (const script of this.ir1.scripts) {
            for (const func of script.functions) {
                this._functions.set(func, this.spiderModule.createFunction());
            }
        }
    }

    public getSpiderFunction(func: IR1Function): SpiderFunctionDefinition {
        const spiderFunc = this._functions.get(func);
        IR1Logger.assert(spiderFunc !== undefined);
        return spiderFunc;
    }
}
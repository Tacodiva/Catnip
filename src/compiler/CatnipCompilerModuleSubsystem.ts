import { SpiderModule } from "wasm-spider";
import { CatnipCompiler } from "./CatnipCompiler";
import { CatnipCompilerWasmModule } from "./wasm/CatnipCompilerWasmModule";

export interface CatnipCompilerModuleSubsystemClass<TSubsystem extends CatnipCompilerModuleSubsystem = CatnipCompilerModuleSubsystem> {
    new(compiler: CatnipCompilerWasmModule): TSubsystem;
}

export interface CatnipCompilerModuleSubsystem {

    preModuleWrite?(): void;
    
}

export abstract class CatnipCompilerModuleSubsystem {

    public readonly module: CatnipCompilerWasmModule;
    public get compiler() { return this.module.compiler; }
    public get spiderModule() { return this.module.spiderModule; }

    public constructor(module: CatnipCompilerWasmModule) {
        this.module = module;
    }

}

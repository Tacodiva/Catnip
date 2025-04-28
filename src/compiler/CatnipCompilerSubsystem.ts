import { SpiderModule } from "wasm-spider";
import { CatnipCompiler } from "./CatnipCompiler";

export interface CatnipCompilerSubsystemClass<TSubsystem extends CatnipCompilerSubsystem = CatnipCompilerSubsystem> {
    new(compiler: CatnipCompiler): TSubsystem;
}

export interface CatnipCompilerSubsystem {

    addEvents?(): void;
    
}

export abstract class CatnipCompilerSubsystem {

    public readonly compiler: CatnipCompiler;
    public get spiderModule(): SpiderModule { return this.compiler.spiderModule; }

    public constructor(compiler: CatnipCompiler) {
        this.compiler = compiler;
    }

}

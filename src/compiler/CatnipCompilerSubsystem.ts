import { CatnipCompiler } from "./CatnipCompiler";

export interface CatnipCompilerSubsystemClass<TSubsystem extends CatnipCompilerSubsystem = CatnipCompilerSubsystem> {
    new(compiler: CatnipCompiler): TSubsystem;
}

export interface CatnipCompilerSubsystem {

    
}

export abstract class CatnipCompilerSubsystem {

    public readonly compiler: CatnipCompiler;

    public constructor(compiler: CatnipCompiler) {
        this.compiler = compiler;
    }

}

import { CatnipCompiler } from "../CatnipCompiler";
import { CatnipCompilerStage } from "../CatnipCompilerStage";
import { IR0BasicBlock } from "./IR0BasicBlock";
import { IR0GraphVisDotGenerator } from "./IR0GraphVisDotGenerator";
import { IR0Script } from "./IR0Script";

export class IR0 {

    public readonly compiler: CatnipCompiler;
    public readonly scripts: IR0Script[];

    public constructor(compiler: CatnipCompiler) {
        this.compiler = compiler;
        this.compiler.assertStage(CatnipCompilerStage.SB3_IR0_PREPASS);

        this.scripts = [];
    }

    public forEachBasicBlock(iterator: (block: IR0BasicBlock) => void) {
        for (const script of this.scripts) script.forEachBasicBlock(iterator);
    }

    public createGraphVis(): string;
    public createGraphVis(generator: IR0GraphVisDotGenerator): void;

    public createGraphVis(gen?: IR0GraphVisDotGenerator): string | void {

        let generator: IR0GraphVisDotGenerator;

        if (gen) generator = gen;
        else generator = new IR0GraphVisDotGenerator();

        for (const script of this.scripts) script.createGraphVisNode(generator);

        if (gen) return;
        return generator.toDotFile();
    }
}

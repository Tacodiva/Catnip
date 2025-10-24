import { CatnipCompiler } from "../CatnipCompiler";
import { IR1Function } from "./IR1Function";
import { IR1Script } from "./IR1Script";
import { IR1StringificationContext } from "./IR1StringificationContext";

export class IR1 {

    public readonly compiler: CatnipCompiler;
    public readonly scripts: IR1Script[];

    public constructor(compiler: CatnipCompiler) {
        this.compiler = compiler;

        this.scripts = [];
    }

    public forEachFunction(iterator: (func: IR1Function) => void) {
        for (const script of this.scripts) script.functions.forEach(iterator);
    }

    public stringify(): string {
        const ctx = new IR1StringificationContext();

        for (const script of this.scripts) {
            script.stringify(ctx);
        }

        return ctx.toString();
    }
}

import { CatnipCompiler } from "./CatnipCompiler";
import { CatnipIr } from "./CatnipIr";
import { CatnipIrFunction } from "./CatnipIrFunction";
import { CatnipIrOp } from "./CatnipIrOp";

export class CatnipCompilerPassContext {

    public readonly compiler: CatnipCompiler;
    public readonly irs: readonly CatnipIr[];

    constructor(compiler: CatnipCompiler, irs: readonly CatnipIr[]) {
        this.compiler = compiler;
        this.irs = irs;
    }

    public forEachIr(lambda: (ir: CatnipIr) => void) {
        this.irs.forEach(lambda);
    }

    public forEachFunction(lambda: (func: CatnipIrFunction) => void) {
        for (const ir of this.irs)
            for (const func of ir.functions)
                lambda(func);
    }

    public forEachOp(lambda: (op: CatnipIrOp, ir: CatnipIr) => void) {
        for (const ir of this.irs)
            ir.forEachOp(op => lambda(op, ir));
    }

}
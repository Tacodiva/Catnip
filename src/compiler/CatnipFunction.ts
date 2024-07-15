import { CatnipIrCommandList } from "../ir";
import { CatnipCompiler } from "./CatnipCompiler";

export class CatnipFunction {

    public readonly compiler: CatnipCompiler;

    public needsTableEntry : boolean;
    public commandList: CatnipIrCommandList;

    public constructor(compiler: CatnipCompiler) {
        this.compiler = compiler;
        this.needsTableEntry = false;
        this.commandList = new CatnipIrCommandList();
    }
}
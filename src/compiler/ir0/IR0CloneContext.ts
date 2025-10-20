import { CatnipCompilerTransientVariable } from "../CatnipCompilerTransientVariable";
import { IR0BasicBlock } from "./IR0BasicBlock";
import { IR0Script } from "./IR0Script";

export class IR0CloneContext {
    public dstScript: IR0Script;

    public transients: Map<CatnipCompilerTransientVariable, CatnipCompilerTransientVariable>;
    public blocks: Map<IR0BasicBlock, IR0BasicBlock>;

    public constructor(dstScript: IR0Script) {
        this.dstScript = dstScript;
        this.transients = new Map();
        this.blocks = new Map();
    }

    public getTransient(src: CatnipCompilerTransientVariable) {
        let dst = this.transients.get(src);

        if (dst !== undefined) return dst;

        dst = new CatnipCompilerTransientVariable(
            src.name, src.format
        );

        this.transients.set(src, dst);

        return dst;
    }

    public getBlock(src: IR0BasicBlock): IR0BasicBlock {
        let dst = this.blocks.get(src);

        if (dst !== undefined) return dst;

        dst = src.clone(this);

        return dst;
    }
}
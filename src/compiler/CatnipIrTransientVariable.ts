import { SpiderNumberType } from "wasm-spider";
import { CatnipValueFormat } from "./CatnipValueFormat";
import { CatnipValueFormatUtils } from "./CatnipValueFormatUtils";
import { CatnipIr } from "./CatnipIr";

export class CatnipIrTransientVariable {
    public readonly ir: CatnipIr;
    public readonly name: string | null;

    /// This is the broadest format of what will be stored in this transient
    public readonly format: CatnipValueFormat;

    public constructor(ir: CatnipIr, format: CatnipValueFormat, name?: string) {
        this.ir = ir;
        this.format = format;
        this.name = name ? ir.getUniqueTransientVariableName(name) : null;
    }

    public get type(): SpiderNumberType {
        return CatnipValueFormatUtils.getFormatSpiderType(this.format);
    }

    public get size(): number {
        switch (this.type) {
            case SpiderNumberType.i32:
            case SpiderNumberType.f32:
                return 4;
            case SpiderNumberType.i64:
            case SpiderNumberType.f64:
                return 8;
        }
    }
}
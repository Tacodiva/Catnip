import { CatnipValueFormat } from "./CatnipValueFormat";

export class CatnipCompilerTransientVariable {
    public readonly name: string;
    public readonly format: CatnipValueFormat;

    public constructor(name: string, format: CatnipValueFormat) {
        this.name = name;
        this.format = format;
    }
}
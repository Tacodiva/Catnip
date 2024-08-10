import { SpiderNumberType } from "wasm-spider";
import { CatnipValueFormat, getValueFormatSpiderType } from "../ir/types";

/**
 * Functions will need to store:
 *  -> The inputs which are stored as a set of "sources" and "storage types"
 *      - Sources are where callers need to get the values from. Could be a "CatnipIrValue" or a
 *          procedure parameter.
 *      - Storage types are how the callers needs to pass the values to the function. Could be as
 *          a parameter or via the thread stack.
 *  -> Stack state
 *      - The expected minimum size of the stack when the function is called.
 * 
 * A value is created in only one function then passed along to any other functions who need it.
 * 
 * Each value is translated to WASM as a local variable.
 * 
 * The caller is responsible for ensuring the stack has the correct values and is of the corrcet size
 *     before calling a function.
 * 
 */

export class CatnipIrVariable {

    public readonly name: string | null;
    public readonly format: CatnipValueFormat;

    public constructor(type: CatnipValueFormat, name?: string) {
        this.format = type;
        this.name = name ?? null;
    }

    public get type(): SpiderNumberType {
        return getValueFormatSpiderType(this.format);
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
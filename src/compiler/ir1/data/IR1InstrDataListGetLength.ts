import { SpiderNumberType, SpiderOpcodes } from "wasm-spider";
import { CatnipList } from "../../../runtime/CatnipList";
import { CatnipTarget } from "../../../runtime/CatnipTarget";
import { CatnipValue } from "../../CatnipValue";
import { CatnipCompilerWasmEmitter } from "../../wasm/CatnipCompilerWasmEmitter";
import { IR1Instruction } from "../IR1Instruction";
import { IR1StringificationContext } from "../IR1StringificationContext";
import { ListUtils } from "./ListUtils";
import { CatnipWasmUnionValue, VALUE_STRING_MASK } from "../../../wasm-interop/CatnipWasmStructValue";

export class IR1InstrDataListGetLength extends IR1Instruction {

    public list: CatnipList;
    public target: CatnipTarget | null;

    public constructor(list: CatnipList, target: CatnipTarget | null) {
        super();
        this.list = list;
        this.target = target;
    }

    public emitWasm(emitter: CatnipCompilerWasmEmitter): void {
        ListUtils.emitPushListLength(emitter, this.target, this.list);
    }

    public stringify(ctx: IR1StringificationContext): void {
        ctx.writeLine(`data_list_get_length '${this.list.name}'`);
    }
}
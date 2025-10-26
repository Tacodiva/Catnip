import { SpiderNumberType, SpiderOpcodes } from "wasm-spider";
import { CatnipList } from "../../../runtime/CatnipList";
import { CatnipTarget } from "../../../runtime/CatnipTarget";
import { CatnipWasmStructList } from "../../../wasm-interop/CatnipWasmStructList";
import { CatnipWasmStructTarget } from "../../../wasm-interop/CatnipWasmStructTarget";
import { CatnipCompilerWasmEmitter } from "../../wasm/CatnipCompilerWasmEmitter";
import { IR1Instruction } from "../IR1Instruction";
import { IR1StringificationContext } from "../IR1StringificationContext";

export class IR1InstrDataListClear extends IR1Instruction {

    public list: CatnipList;
    public target: CatnipTarget | null;

    public constructor(list: CatnipList, target: CatnipTarget | null) {
        super();
        this.list = list;
        this.target = target;
    }

    public emitWasm(emitter: CatnipCompilerWasmEmitter): void {
        const listOffset = this.list.index * CatnipWasmStructList.size;

        // To clear a list, we just set its length to 0

        if (this.target === null) emitter.emitWasmPushCurrentTarget();
        else emitter.emitWasmPushNumber(SpiderNumberType.i32, this.target.structWrapper.ptr);

        emitter.emitWasm(SpiderOpcodes.i32_load, 2, CatnipWasmStructTarget.getMemberOffset("list_table"));
        emitter.emitWasmPushNumber(SpiderNumberType.i32, 0);
        emitter.emitWasm(SpiderOpcodes.i32_store, 2, listOffset + CatnipWasmStructList.getMemberOffset("length"));

    }

    public stringify(ctx: IR1StringificationContext): void {
        ctx.writeLine(`data_list_clear '${this.list.name}'`);
    }
}
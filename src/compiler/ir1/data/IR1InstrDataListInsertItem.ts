import { SpiderNumberType, SpiderOpcodes } from "wasm-spider";
import { CatnipList } from "../../../runtime/CatnipList";
import { CatnipTarget } from "../../../runtime/CatnipTarget";
import { CatnipValue } from "../../CatnipValue";
import { CatnipCompilerWasmEmitter } from "../../wasm/CatnipCompilerWasmEmitter";
import { IR1Instruction } from "../IR1Instruction";
import { IR1StringificationContext } from "../IR1StringificationContext";
import { ListUtils } from "./ListUtils";

export class IR1InstrDataListInsertItem extends IR1Instruction {

    public list: CatnipList;
    public target: CatnipTarget | null;
    public index: CatnipValue;

    public constructor(list: CatnipList, target: CatnipTarget | null, indexFormat: CatnipValue) {
        super();
        this.list = list;
        this.target = target;
        this.index = indexFormat;
    }

    public emitWasm(emitter: CatnipCompilerWasmEmitter): void {
        const valueVariable = emitter.borrowLocal(SpiderNumberType.f64);
        emitter.emitWasm(SpiderOpcodes.local_set, valueVariable);

        ListUtils.emitListBoundsCheck(emitter,
            {
                list: this.list,
                target: this.target,
                index: this.index,

                allowEqualToLength: true,
                allowLast: true
            },
            (emitter, indexLocal) => {
                // Valid index

                emitter.emitWasm(SpiderOpcodes.local_get, indexLocal);
                emitter.emitWasm(SpiderOpcodes.local_get, valueVariable);

                // Get the pointer to the list's data
                ListUtils.emitPushListPtr(emitter, this.target, this.list);

                emitter.emitWasmRuntimeFunctionCall("catnip_blockutil_list_insert_at");
            },
            emitter => {
                // Invalid index
            }
        );

        emitter.returnLocal(valueVariable);
    }

    public stringify(ctx: IR1StringificationContext): void {
        ctx.writeLine(`data_list_insert_item '${this.list.name}'`);
    }
}
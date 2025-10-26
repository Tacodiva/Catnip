import { SpiderOpcodes } from "wasm-spider";
import { CatnipList } from "../../../runtime/CatnipList";
import { CatnipTarget } from "../../../runtime/CatnipTarget";
import { CatnipValue } from "../../CatnipValue";
import { CatnipCompilerWasmEmitter } from "../../wasm/CatnipCompilerWasmEmitter";
import { IR1Instruction } from "../IR1Instruction";
import { IR1StringificationContext } from "../IR1StringificationContext";
import { ListUtils } from "./ListUtils";

export class IR1InstrDataListDeleteItem extends IR1Instruction {

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
        ListUtils.emitListBoundsCheck(emitter,
            {
                list: this.list,
                target: this.target,
                index: this.index,

                allowEqualToLength: false,
                allowLast: true
            },
            (emitter, indexLocal) => {
                // Valid index

                emitter.emitWasm(SpiderOpcodes.local_get, indexLocal);
                ListUtils.emitPushListPtr(emitter, this.target, this.list);

                emitter.emitWasmRuntimeFunctionCall("catnip_blockutil_list_delete_at");
            },
            emitter => {
                // Invalid index
            }
        );
    }

    public stringify(ctx: IR1StringificationContext): void {
        ctx.writeLine(`data_list_delete_item '${this.list.name}'`);
    }
}
import { SpiderNumberType, SpiderOpcodes } from "wasm-spider";
import { CatnipList } from "../../../runtime/CatnipList";
import { CatnipTarget } from "../../../runtime/CatnipTarget";
import { CatnipWasmUnionValue } from "../../../wasm-interop/CatnipWasmStructValue";
import { CatnipValue } from "../../CatnipValue";
import { CatnipCompilerWasmEmitter } from "../../wasm/CatnipCompilerWasmEmitter";
import { IR1Instruction } from "../IR1Instruction";
import { IR1StringificationContext } from "../IR1StringificationContext";
import { ListUtils } from "./ListUtils";

export class IR1InstrDataListGetItem extends IR1Instruction {

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

                ListUtils.emitPushListItemPtr(emitter, this.target, this.list, indexLocal);
                emitter.emitWasm(SpiderOpcodes.f64_load, 3, 0);
                
            },
            emitter => {
                // Invalid index

                // Push the empty string
                emitter.emitWasmPushBoxedString("");
            },
            SpiderNumberType.f64
        );
    }

    public stringify(ctx: IR1StringificationContext): void {
        ctx.writeLine(`data_list_get_item '${this.list.name}'`);
    }
}
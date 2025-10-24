import { CatnipProcedureID } from "../../../ops/procedure/procedure_definition";
import { CatnipCompilerWasmEmitter } from "../../wasm/CatnipCompilerWasmEmitter";
import { IR1Trigger } from "../IR1Trigger";


export class IR1TriggerProcedure extends IR1Trigger {
    public readonly isTopLevel = false;

    public readonly procedureID: CatnipProcedureID;
    public readonly isWarp: boolean;

    public constructor(procedureID: CatnipProcedureID, isWarp: boolean) {
        super();
        this.procedureID = procedureID;
        this.isWarp = isWarp;
    }

    public emitEntryWasm(emitter: CatnipCompilerWasmEmitter): void {
    }

    public stringify(): string {
        return `procedure '${this.procedureID}' (warp = ${this.isWarp})`;
    }

}

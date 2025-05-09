import { CatnipProcedureID } from "../../ops/procedure/procedure_definition";
import { CatnipScript } from "../../runtime/CatnipScript";
import { CatnipSpriteID } from "../../runtime/CatnipSprite";
import { CatnipCompiler } from "../CatnipCompiler";
import { CatnipCompilerSubsystem } from "../CatnipCompilerSubsystem";
import { CatnipIrScriptProcedureTrigger } from "../ir/procedure/procedure_trigger";


interface ProcedureVarients {
    warp?: CatnipIrScriptProcedureTrigger,
    noWarp?: CatnipIrScriptProcedureTrigger
}

export class CatnipCompilerProcedureSubsystem extends CatnipCompilerSubsystem {

    private readonly _compiledProcedures: Map<CatnipSpriteID, Map<CatnipProcedureID, ProcedureVarients>>;

    public constructor(compiler: CatnipCompiler) {
        super(compiler);
        this._compiledProcedures = new Map();
    }

    public registerProcedure(trigger: CatnipIrScriptProcedureTrigger) {
        let procedures = this._compiledProcedures.get(trigger.ir.spriteID);

        if (procedures === undefined) {
            procedures = new Map();
            this._compiledProcedures.set(trigger.ir.spriteID, procedures);
        }

        let varients = procedures.get(trigger.inputs.id);

        if (varients === undefined) {
            varients = {};
            procedures.set(trigger.inputs.id, varients);
        }

        if (trigger.inputs.warp) {
            varients.warp = trigger;
        } else {
            varients.noWarp = trigger;
        }
    }

    public getProcedureInfo(spriteID: CatnipSpriteID, procedureID: CatnipProcedureID, warp: boolean): CatnipIrScriptProcedureTrigger {
        const procedureInfo = this.tryGetProcedureInfo(spriteID, procedureID, warp);

        if (procedureInfo === undefined)
            throw new Error(`No procedure '${procedureID}' in sprite '${spriteID}' (warp ${warp}) has been compiled.`);

        return procedureInfo;
    }

    public tryGetProcedureInfo(spriteID: CatnipSpriteID, procedureID: CatnipProcedureID, warp: boolean): CatnipIrScriptProcedureTrigger | undefined {
        let spriteProcedures = this._compiledProcedures.get(spriteID);

        if (spriteProcedures === undefined) return undefined;

        let varients = spriteProcedures.get(procedureID);

        if (varients === undefined) return undefined;

        return warp ? varients.warp : varients.noWarp;
    }
}
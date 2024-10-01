import { CatnipProcedureID } from "../../ops/procedure/procedure_definition";
import { CatnipScript } from "../../runtime/CatnipScript";
import { CatnipSpriteID } from "../../runtime/CatnipSprite";
import { CatnipCompiler } from "../CatnipCompiler";
import { CatnipCompilerSubsystem } from "../CatnipCompilerSubsystem";
import { CatnipIrScriptProcedureTrigger } from "../ir/procedure/procedure_trigger";


export class CatnipCompilerProcedureSubsystem extends CatnipCompilerSubsystem {

    private readonly _compiledProcedures: Map<CatnipSpriteID, Map<CatnipProcedureID, CatnipIrScriptProcedureTrigger>>;

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
        procedures.set(trigger.inputs.id, trigger);
    }

    public getProcedureInfo(spriteID: CatnipSpriteID, procedureID: CatnipProcedureID): CatnipIrScriptProcedureTrigger {
        const procedureInfo = this.tryGetProcedureInfo(spriteID, procedureID);

        if (procedureInfo === undefined)
            throw new Error(`No procedure '${procedureID}' in sprite '${spriteID}' has been compiled.`);

        return procedureInfo;
    }

    public tryGetProcedureInfo(spriteID: CatnipSpriteID, procedureID: CatnipProcedureID): CatnipIrScriptProcedureTrigger | undefined {
        let spriteProcedures = this._compiledProcedures.get(spriteID);

        if (spriteProcedures === undefined) {
            spriteProcedures = new Map();
            this._compiledProcedures.set(spriteID, spriteProcedures);
        }

        let procedureInfo = spriteProcedures.get(procedureID);

        return procedureInfo;
    }
}
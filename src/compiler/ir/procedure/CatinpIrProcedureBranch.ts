import { CatnipProcedureID } from "../../../ops/procedure/procedure_definition";
import { CatnipSpriteID } from "../../../runtime/CatnipSprite";
import { CatnipIrBasicBlock } from "../../CatnipIrBasicBlock";
import { CatnipIrExternalBranch } from "../../CatnipIrBranch";
import { CatnipCompiler } from '../../CatnipCompiler';
import { CatnipCompilerProcedureSubsystem } from '../../subsystems/CatnipCompilerProcedureSubsystem';

export class CatnipIrProcedureBranch extends CatnipIrExternalBranch {
    public readonly compiler: CatnipCompiler;
    public readonly spriteID: CatnipSpriteID;
    public readonly procedureID: CatnipProcedureID;
    
    public constructor(compiler: CatnipCompiler, spriteID: CatnipSpriteID, procedureID: CatnipProcedureID) {
        super();
        this.compiler = compiler;
        this.spriteID = spriteID;
        this.procedureID = procedureID;
    }
    
    protected _tryResolve(): CatnipIrBasicBlock | null {
        const procedureSubsystem = this.compiler.getSubsystem(CatnipCompilerProcedureSubsystem);
        const procedureInfo = procedureSubsystem.tryGetProcedureInfo(this.spriteID, this.procedureID);

        if (procedureInfo === undefined) return null;

        if (!procedureInfo.ir.hasCommandIR)
            this.compiler._createCommandIR(procedureInfo.ir);

        return procedureInfo.ir.entrypoint.body;
    }
}
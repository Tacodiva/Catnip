import { CatnipProcedureID } from "../../../ops/procedure/procedure_definition";
import { CatnipSpriteID } from "../../../runtime/CatnipSprite";
import { CatnipIrBasicBlock } from "../../CatnipIrBasicBlock";
import { CatnipIrExternalBranch } from "../../CatnipIrBranch";
import { CatnipCompiler } from '../../CatnipCompiler';
import { CatnipCompilerProcedureSubsystem } from '../../subsystems/CatnipCompilerProcedureSubsystem';
import { CatnipIr } from "../../CatnipIr";

export class CatnipIrProcedureBranch extends CatnipIrExternalBranch {

    public readonly compiler: CatnipCompiler;
    public readonly spriteID: CatnipSpriteID;
    public readonly procedureID: CatnipProcedureID;
    public readonly isWarp: boolean;

    public constructor(compiler: CatnipCompiler, spriteID: CatnipSpriteID, procedureID: CatnipProcedureID, isWarp: boolean) {
        super();
        this.compiler = compiler;
        this.spriteID = spriteID;
        this.procedureID = procedureID;
        this.isWarp = isWarp;
    }

    protected _tryResolveIR(): CatnipIr | null {
        const procedureSubsystem = this.compiler.getSubsystem(CatnipCompilerProcedureSubsystem);
        const procedureInfo = procedureSubsystem.tryGetProcedureInfo(this.spriteID, this.procedureID, this.isWarp);

        if (procedureInfo === undefined) return null;

        return procedureInfo.ir;
    }

    protected _isYielding(visited: Set<CatnipIrBasicBlock>): boolean {
        const ir = this._tryResolveIR();
        if (ir === null) throw new Error("IR not resolved.");
        return ir.preAnalysis.isYielding;
    }

    protected _tryResolveBlock(): CatnipIrBasicBlock | null {
        const ir = this._tryResolveIR();
        if (ir === null) return null;

        if (!ir.hasCommandIR)
            ir.createCommandIR();

        return ir.entrypoint.body;
    }
}
import { CatnipProcedureID, procedure_trigger } from "../../ops/procedure/procedure_definition";
import { CatnipProject } from "../../runtime/CatnipProject";
import { CatnipScript } from "../../runtime/CatnipScript";
import { CatnipSpriteID } from "../../runtime/CatnipSprite";
import { CatnipCompilerLogger } from "../CatnipCompilerLogger";
import { CatnipCompilerStage } from "../CatnipCompilerStage";
import { IR0 } from "./IR0";
import { IR0Script } from "./IR0Script";
import { IR0TriggerProcedure } from "./procedure/IR0TriggerProcedure";

interface ProcedureVarients {
    warp?: IR0Script;
    noWarp?: IR0Script;
}

export class SB3ToIR0Info {

    public readonly project: CatnipProject;
    public readonly ir0: IR0;

    public get compiler() { return this.ir0.compiler; }

    private readonly _procedures: Map<CatnipSpriteID, Map<CatnipProcedureID, ProcedureVarients>>;
    private readonly _scripts: Map<IR0Script, CatnipScript>;

    private _toPrepass: [IR0Script, CatnipScript][];

    public constructor(project: CatnipProject, ir0: IR0) {
        this.project = project;
        this.ir0 = ir0;
        this._procedures = new Map();
        this._scripts = new Map();
        this._toPrepass = [];
    }

    public create() {
        for (const sprite of this.project.sprites) {
            for (const script of sprite.scripts) {
                this.addScript(new IR0Script(this.ir0, {
                    spriteID: sprite.id,
                    trigger: script.trigger
                }), script);
            }
        }

        // Prepass
        while (this._toPrepass.length !== 0) {
            const [ir0, sb3] = this._toPrepass.pop()!;

            for (const cmd of sb3.commands) {
                cmd.type.prepass(ir0, this, cmd.inputs);
            }
        }
    }

    public addScript(ir0: IR0Script, sb3: CatnipScript): IR0Script {
        this.compiler.assertStage(CatnipCompilerStage.SB3_IR0_PREPASS);

        this._scripts.set(ir0, sb3);
        this._toPrepass.push([ir0, sb3]);

        if (ir0.trigger instanceof IR0TriggerProcedure) {
            const varients = this._getProcedureVarients(ir0.spriteID, ir0.trigger.procedureID);
            if (ir0.isWarp) varients.warp = ir0;
            else varients.noWarp = ir0;
        }

        return ir0;
    }

    public getScriptSB3(ir0: IR0Script): CatnipScript {
        const sb3 = this._scripts.get(ir0);
        CatnipCompilerLogger.assert(sb3 !== undefined);
        return sb3;
    }

    private _getProcedureVarients(spriteID: CatnipSpriteID, procedureID: CatnipProcedureID): ProcedureVarients {
        let spriteProcedures = this._procedures.get(spriteID);

        if (spriteProcedures === undefined)
            this._procedures.set(spriteID, spriteProcedures = new Map());

        let procedureVarients = spriteProcedures.get(procedureID);

        if (procedureVarients === undefined)
            spriteProcedures.set(procedureID, procedureVarients = {});

        return procedureVarients;
    }

    public getIR0Procedure(spriteID: CatnipSpriteID, procedureID: CatnipProcedureID, warp: boolean): IR0Script {
        const procedureVarients = this._getProcedureVarients(spriteID, procedureID);
        let procedure = warp ? procedureVarients.warp : procedureVarients.noWarp;

        if (procedure !== undefined) return procedure;

        if (warp && procedureVarients.noWarp !== undefined) {
            return this.addScript(new IR0Script(this.ir0, {
                spriteID,
                trigger: procedure_trigger.create({
                    id: procedureID,
                    args: (procedureVarients.noWarp.trigger as IR0TriggerProcedure).args,
                    warp: true
                })
            }), this.getScriptSB3(procedureVarients.noWarp));
        }

        throw new Error(`Could not find procedure '${procedureID}' in sprite '${spriteID}' (warp: ${warp}).`);
    }

}
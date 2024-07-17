
import { CatnipCommandList } from '../ir/CatnipOp';
import { CatnipSprite } from './CatnipSprite';


export interface CatnipScriptTriggerProcedureDesc {
    type: "procedure",
}

export type CatnipEventID = string;

export interface CatnipScriptTriggerEventDesc {
    type: "event",
    event: CatnipEventID
}

export type CatnipScriptTriggerDesc = CatnipScriptTriggerProcedureDesc | CatnipScriptTriggerEventDesc;

export type CatnipScriptID = string;

export interface CatnipScriptDesc {
    id: CatnipScriptID,
    trigger: CatnipScriptTriggerDesc,
    commands: CatnipCommandList
};

export class CatnipScript {

    public readonly sprite: CatnipSprite;
    public readonly id: CatnipScriptID;

    private _commands: CatnipCommandList;
    public get commands(): CatnipCommandList { return this._commands; }

    private _dependantScripts: Set<CatnipScript>;
    private _recompile: boolean;

    public constructor(sprite: CatnipSprite, desc: CatnipScriptDesc) {
        this.sprite = sprite;
        this.id = desc.id;
        this._commands = desc.commands;
        this._dependantScripts = new Set();
        this._recompile = true;
        
    }

    public delete() {
        this.sprite.deleteScript(this);
    }

    public triggerRecompile() {
        if (!this._recompile) {
            this._recompile = true;
            this.sprite.project._addRecompileScript(this);
            this._recompileDependantScripts();
        }
    }

    public addDependantScript(script: CatnipScript) {
        this._dependantScripts.add(script);
    }

    public removeDependantScript(script: CatnipScript): boolean {
        return this._dependantScripts.delete(script);
    }

    private _recompileDependantScripts() {
        for (const dependantScript of this._dependantScripts) {
            dependantScript.triggerRecompile();
        }
    }

    /** @internal */
    _onDelete() {
        this._recompileDependantScripts();
        this.sprite.project._removeRecompileScript(this);
    }

}
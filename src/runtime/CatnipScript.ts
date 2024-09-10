
import { CatnipCommandList } from '../ops/CatnipOp';
import { CatnipSprite } from './CatnipSprite';


export type CatnipProcedureID = string;

export enum CatnipScriptTriggerProcedureArgTypeDesc {
    STRING_OR_NUMBER,
    BOOLEAN
}

export interface CatnipScriptTriggerProcedureArgDesc {
    type: CatnipScriptTriggerProcedureArgTypeDesc,
    name: string,
}

export interface CatnipScriptTriggerProcedureDesc {
    type: "procedure",
    id: CatnipProcedureID,
    args: CatnipScriptTriggerProcedureArgDesc[]
}

export type CatnipEventID = string;

export interface CatnipScriptTriggerEventDesc {
    type: "event",
    event: CatnipEventID,
    priority?: number
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

    public readonly trigger: Readonly<CatnipScriptTriggerDesc>;

    private _commands: CatnipCommandList;
    public get commands(): CatnipCommandList { return this._commands; }

    private _dependantScripts: Set<CatnipScript>;
    private _recompile: boolean;
    public get recompile(): boolean { return this._recompile; }

    public constructor(sprite: CatnipSprite, desc: CatnipScriptDesc) {
        this.sprite = sprite;
        this.id = desc.id;
        this.trigger = desc.trigger;
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

    /** @internal */
    _onCompile() {
        this._recompile = false;
    }

}
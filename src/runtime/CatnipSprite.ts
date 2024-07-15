import { createLogger } from "../log";
import { CatnipWasmStructSprite } from "../wasm-interop/CatnipWasmStructSprite";
import { WasmPtr, WasmStructWrapper } from "../wasm-interop/wasm-types";
import { CatnipProject } from "./CatnipProject";
import { CatnipScript, CatnipScriptDesc, CatnipScriptID } from "./CatnipScript";
import { CatnipVariable, CatnipVariableDesc, CatnipVariableID } from "./CatnipVariable";

export type CatnipSpriteID = string;

export interface CatnipSpriteDesc {
    id: CatnipSpriteID;
    name: string;
    variables: CatnipVariableDesc[];
    scripts: CatnipScriptDesc[];
}

export class CatnipSprite {

    private static _logger = createLogger("CatnipSprite");

    public readonly project: CatnipProject;
    public readonly structWrapper: WasmStructWrapper<typeof CatnipWasmStructSprite>;
    public get runtime() { return this.project.runtimeModule; }

    public readonly id: CatnipSpriteID;

    private _name: string;
    private _rewriteName: boolean;

    private readonly _variables: Map<CatnipVariableID, CatnipVariable>;
    private _rewriteVariableList: boolean;
    private _rewriteVariables: Set<CatnipVariable>;

    private readonly _scripts: Map<CatnipScriptID, CatnipScript>;
    private _rewriteScripts: boolean;

    /** @internal */
    constructor(project: CatnipProject, desc: CatnipSpriteDesc) {
        this.id = desc.id;
        this.project = project;

        this._variables = new Map();
        this._scripts = new Map();

        this.structWrapper = this.runtime.allocateStruct(CatnipWasmStructSprite);

        this._rewriteName = true;
        this._name = desc.name;

        this._rewriteVariableList = true;
        this._rewriteVariables = new Set();
        for (const varDesc of desc.variables) {
            this.createVariable(varDesc);
        }

        this._rewriteScripts = true;
        for (const scriptDesc of desc.scripts) {
            this.createScript(scriptDesc);
        }
    }

    private _isValid(): boolean {
        return this.project.getSprite(this.id) == this;
    }

    public get name() { return this._name; }

    public set name(value: string) {
        this._name = value;
        this._rewriteName = true;
        this._markRewrite();
    }

    public createVariable(desc: CatnipVariableDesc): CatnipVariable {
        const variable = new CatnipVariable(this, desc);
        this._variables.set(variable.id, variable);
        this._rewriteVariables.add(variable);
        this._rewriteVariableList = true;
        this._markRewrite();
        return variable;
    }

    public getVariable(id: CatnipVariableID): CatnipVariable | undefined {
        return this._variables.get(id);
    }

    public deleteVariable(variable: CatnipVariable): boolean {
        if (this._variables.delete(variable.id)) {
            this._rewriteVariables.delete(variable);
            this._rewriteVariableList = true;
            this._markRewrite();
            variable._onDelete();
            return true;
        }
        return false;
    }

    public createScript(desc: CatnipScriptDesc): CatnipScript {
        const script = new CatnipScript(this, desc);
        this._scripts.set(script.id, script);
        this.project._addRecompileScript(script);
        this._rewriteScripts = true;
        this._markRewrite();
        return script;
    }

    public getScript(id: CatnipScriptID): CatnipScript | undefined {
        return this._scripts.get(id);
    }

    public deleteScript(script: CatnipScript): boolean {
        if (this._scripts.delete(script.id)) {
            this.project._removeRecompileScript(script);
            this._rewriteScripts = true;
            this._markRewrite();
            script._onDelete();
            return true;
        }
        return false;
    }

    private _markRewrite() {
        this.project._rewriteSprite(this);
    }

    /** @internal */
    _rewriteVariable(variable: CatnipVariable): void {
        this._rewriteVariables.add(variable);
        this._markRewrite();
    }

    /** @internal */
    _rewrite() {
        if (this._rewriteName) {
            let namePtr = this.structWrapper.getMember("name");
            if (namePtr !== 0)
                this.runtime.functions.catnip_hstring_deref(namePtr);
            namePtr = this.runtime.allocateHeapString(this.name);
            this.structWrapper.setMember("name", namePtr);
            this._rewriteName = false;
        }

        if (this._rewriteVariableList) {
            let variablesPtr = this.structWrapper.getMember("variables");
            if (variablesPtr !== 0)
                this.runtime.freeMemory(variablesPtr);

            variablesPtr = this.runtime.allocateMemory(this._variables.size * WasmPtr.size, false);

            this.structWrapper.setMember("variable_count", this._variables.size);
            this.structWrapper.setMember("variables", variablesPtr);

            let i = 0;
            for (const variable of this._variables.values()) {
                WasmPtr.set(variablesPtr + (i * WasmPtr.size), this.runtime.memory, variable.structWrapper.ptr);
                variable._index = i;
                ++i;
            }

            this._rewriteVariableList = false;
        }

        if (this._rewriteVariables.size !== 0) {
            for (const rewriteVariable of this._rewriteVariables) {
                rewriteVariable._rewrite();
            }
            this._rewriteVariables.clear();
        }
    }

}
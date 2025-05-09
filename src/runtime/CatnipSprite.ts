import { createLogger } from "../log";
import { CatnipWasmStructCostume } from "../wasm-interop/CatnipWasmStructCostume";
import { CatnipWasmStructSprite } from "../wasm-interop/CatnipWasmStructSprite";
import { WasmPtr, WasmStructWrapper } from "../wasm-interop/wasm-types";
import { CatnipCostume, CatnipCostumeDesc } from "./CatnipCostume";
import { CatnipList, CatnipListDesc, CatnipListID } from "./CatnipList";
import { CatnipProject } from "./CatnipProject";
import { CatnipScript, CatnipScriptDesc, CatnipScriptID } from "./CatnipScript";
import { CatnipTarget, CatnipTargetDesc } from "./CatnipTarget";
import { CatnipVariable, CatnipVariableDesc, CatnipVariableID } from "./CatnipVariable";

export type CatnipSpriteID = string;

export interface CatnipSpriteDesc {
    id: CatnipSpriteID;
    name: string;
    variables: CatnipVariableDesc[];
    lists: CatnipListDesc[];
    scripts: CatnipScriptDesc[];
    costumes: CatnipCostumeDesc[];
    target: CatnipTargetDesc;
}

export class CatnipSprite {

    private static _logger = createLogger("CatnipSprite");

    public readonly project: CatnipProject;
    public readonly structWrapper: WasmStructWrapper<typeof CatnipWasmStructSprite>;
    public get runtime() { return this.project.runtimeModule; }

    public readonly defaultTarget: CatnipTarget;

    public readonly id: CatnipSpriteID;
    public readonly name: string;

    private readonly _variablesMap: Map<CatnipVariableID, CatnipVariable>;
    private readonly _variablesList: CatnipVariable[];

    private readonly _lists: Map<CatnipListID, CatnipList>;
    private readonly _listsList: CatnipVariable[];

    private readonly _scripts: Map<CatnipScriptID, CatnipScript>;

    private readonly _costumes: CatnipCostume[];

    public get scripts(): IterableIterator<CatnipScript> { return this._scripts.values(); }
    public get lists(): readonly CatnipList[] { return this._listsList; }
    public get variables(): readonly CatnipVariable[] { return this._variablesList; }
    public get costumes(): readonly CatnipCostume[] { return this._costumes; }

    /** @internal */
    constructor(project: CatnipProject, desc: CatnipSpriteDesc) {
        this.id = desc.id;
        this.project = project;
        this.name = desc.name;

        this.structWrapper = this.runtime.allocateStruct(CatnipWasmStructSprite);

        this._variablesMap = new Map();
        this._variablesList = [];
        for (const varDesc of desc.variables) {
            const variable = new CatnipVariable(this, this._variablesList.length, varDesc);
            this._variablesMap.set(varDesc.id, this._variablesList[variable.index] = variable);
        }

        this._lists = new Map();
        this._listsList = [];
        for (const listDesc of desc.lists) {
            const list = new CatnipList(this, this._listsList.length, listDesc);
            this._lists.set(listDesc.id, this._listsList[list.index] = list);
        }

        this._scripts = new Map();
        for (const scriptDesc of desc.scripts) {
            this._scripts.set(scriptDesc.id, new CatnipScript(this, scriptDesc));
        }

        this._costumes = [];
        for (const costumeDesc of desc.costumes) {
            this._costumes.push(new CatnipCostume(this, this.costumes.length, costumeDesc));
        }

        
        this.structWrapper.setMember("name", this.runtime.createCanonHString(this.name));

        { // Variables
            const variablesPtr = this.runtime.allocateMemory(this._variablesList.length * WasmPtr.size, false);

            this.structWrapper.setMember("variable_count", this._variablesList.length);
            this.structWrapper.setMember("variables", variablesPtr);

            for (let i = 0; i < this._variablesList.length; i++) {
                WasmPtr.set(variablesPtr + (i * WasmPtr.size), this.runtime.memory, this._variablesList[i].structWrapper.ptr);
            }
        }

        { // Lists
            const listsPtr = this.runtime.allocateMemory(this._listsList.length * WasmPtr.size, false);

            this.structWrapper.setMember("list_count", this._listsList.length);
            this.structWrapper.setMember("lists", listsPtr);

            let i = 0;

            for (let i = 0; i < this._listsList.length; i++) {
                WasmPtr.set(listsPtr + (i * WasmPtr.size), this.runtime.memory, this._listsList[i].structWrapper.ptr);
            }
        }

        { // Costumes
            const costumesPtr = this.runtime.allocateMemory(CatnipWasmStructCostume.size * this._costumes.length);

            this.structWrapper.setMember("costumes", costumesPtr);
            this.structWrapper.setMember("costume_count", this._costumes.length);

            for (let i = 0; i < this._costumes.length; i++) {
                const costumePtr = costumesPtr + i * CatnipWasmStructCostume.size;
                const costumeStruct = CatnipWasmStructCostume.getWrapper(costumePtr, this.structWrapper.bufferProvider);

                this._costumes[i]._write(costumeStruct);
            }
        }

        this.defaultTarget = new CatnipTarget(this, desc.target);
        this.structWrapper.setMember("target", this.defaultTarget.structWrapper.ptr);
    }

    public getVariable(id: CatnipVariableID): CatnipVariable | undefined {
        return this._variablesMap.get(id);
    }

    public getList(id: CatnipListID): CatnipList | undefined {
        return this._lists.get(id);
    }

    public getScript(id: CatnipScriptID): CatnipScript | undefined {
        return this._scripts.get(id);
    }
}
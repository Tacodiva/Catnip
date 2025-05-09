import { WasmStructWrapper } from "../wasm-interop/wasm-types";
import { CatnipSprite } from "./CatnipSprite";
import { CatnipVariableID } from "./CatnipVariable";
import { CatnipWasmStructTarget } from '../wasm-interop/CatnipWasmStructTarget';
import { CatnipListID } from "./CatnipList";
import { CatnipWasmStructValue, CatnipWasmUnionValue } from "../wasm-interop/CatnipWasmStructValue";

export interface CatnipTargetDesc {
    variables: CatnipTargetVariableDesc[];
    lists: CatnipTargetListDesc[];

    x_position: number;
    y_position: number;
    currentCostume: number;
}

export interface CatnipTargetVariableDesc {
    id: CatnipVariableID;
    value: number | string;
}

export interface CatnipTargetListDesc {
    id: CatnipListID;
    value: (number | string)[];
}

export class CatnipTarget {

    public readonly sprite: CatnipSprite;
    public get project() { return this.sprite.project; }
    public get runtime() { return this.project.runtimeModule; }

    public readonly structWrapper: WasmStructWrapper<typeof CatnipWasmStructTarget>;

    private _variables: CatnipTargetVariableDesc[] | null;
    private _lists: CatnipTargetListDesc[] | null;

    private _currentCostume: number;

    /** @internal */
    constructor(sprite: CatnipSprite, desc: CatnipTargetDesc) {
        this.sprite = sprite;

        this.structWrapper = CatnipWasmStructTarget.getWrapper(
            this.runtime.functions.catnip_target_new(
                this.project.runtimeInstance.ptr,
                this.sprite.structWrapper.ptr
            ), () => this.runtime.memory);

        this._variables = desc.variables;
        this._lists = desc.lists;
        this._currentCostume = desc.currentCostume;

        const variableTable = this.structWrapper
            .getMemberWrapper("variable_table")
            .getInnerWrapper();

        for (const { id, value } of this._variables) {
            const variable = this.sprite.getVariable(id);
            if (variable === undefined) continue; // TODO Warn?

            this.runtime.setValue(
                variableTable.getElementWrapper(variable.index),
                value
            );
        }

        const listTable = this.structWrapper
            .getMemberWrapper("list_table")
            .getInnerWrapper();

        for (const { id, value } of this._lists) {
            const list = this.sprite.getList(id);
            if (list === undefined) continue; // TODO Warn?

            const listWrapper = listTable.getElementWrapper(list.index);
            const listDataPtr = this.runtime.allocateMemory(CatnipWasmUnionValue.size * value.length);

            listWrapper.setMember("length", value.length);
            listWrapper.setMember("capacity", value.length);
            listWrapper.setMember("data", listDataPtr);

            for (let itemIndex = 0; itemIndex < value.length; itemIndex++) {
                const listItem = value[itemIndex];

                this.runtime.setValue(
                    CatnipWasmUnionValue.getWrapper(listDataPtr + itemIndex * CatnipWasmUnionValue.size, listWrapper.bufferProvider),
                    listItem
                );
            }
        }

        this.structWrapper.setMember("costume", this._currentCostume);
    }
}
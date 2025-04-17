import { WasmStructWrapper } from "../wasm-interop/wasm-types";
import { CatnipSprite } from "./CatnipSprite";
import { CatnipVariableID } from "./CatnipVariable";
import { CatnipWasmStructTarget } from '../wasm-interop/CatnipWasmStructTarget';

export interface CatnipTargetDesc {
    variables: CatnipTargetVariableDesc[];

    x_position: number;
    y_position: number;
}

export interface CatnipTargetVariableDesc {
    id: CatnipVariableID;
    value: number | string;
}

export class CatnipTarget {

    public readonly sprite: CatnipSprite;
    public get project() { return this.sprite.project; }
    public get runtime() { return this.project.runtimeModule; }

    public readonly structWrapper: WasmStructWrapper<typeof CatnipWasmStructTarget>;

    private _variables: CatnipTargetVariableDesc[] | null;

    /** @internal */
    constructor(sprite: CatnipSprite, desc: CatnipTargetDesc) {
        this.sprite = sprite;

        this.structWrapper = CatnipWasmStructTarget.getWrapper(
            this.runtime.functions.catnip_target_new(
                this.project.runtimeInstance.ptr,
                this.sprite.structWrapper.ptr
            ), () => this.runtime.memory);

        this._variables = desc.variables;
    }

    /** @internal */
    _rewrite() {

        if (this._variables !== null) {
            const variableTable = this.structWrapper
                .getMemberWrapper("variable_table")
                .getInnerWrapper();

            for (const { id, value } of this._variables) {
                const variable = this.sprite.getVariable(id);
                if (variable === undefined) continue;

                this.runtime.setValue(
                    variableTable.getElementWrapper(variable._index),
                    value
                );
            }

            this._variables = null;
        }
    }
}
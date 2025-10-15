import { SpiderFunction, SpiderFunctionDefinition, SpiderLocalParameterReference, SpiderNumberType, SpiderOpcodes } from "wasm-spider";
import { CatnipSpriteID } from "../../runtime/CatnipSprite";
import { CatnipWasmStructRuntime } from "../../wasm-interop/CatnipWasmStructRuntime";
import { CatnipWasmStructTarget } from "../../wasm-interop/CatnipWasmStructTarget";
import { CatnipCompilerLogger } from "../CatnipCompilerLogger";
import { CatnipCompilerWasmModule } from "./CatnipCompilerWasmModule";

/**
 * Generates a function which starts threads with listener functions.
 */
export class CatnipCompilerWasmTrigger {
    public readonly module: CatnipCompilerWasmModule;

    public readonly listeners: Map<CatnipSpriteID, { func: SpiderFunction, priority: number }[]>;
    public readonly triggerFunction: SpiderFunctionDefinition;
    public readonly writeThreadList: boolean;

    private _generated: boolean;

    public constructor(module: CatnipCompilerWasmModule, writeThreadList: boolean) {
        this.module = module;
        this.listeners = new Map();
        this.triggerFunction = this.module.spiderModule.createFunction();
        this._generated = false;
        this.writeThreadList = writeThreadList;

        if (this.writeThreadList) {
            this.triggerFunction.addParameter(SpiderNumberType.i32);
        }
    }

    public addListener(func: SpiderFunction, spriteID: CatnipSpriteID, priority?: number) {
        CatnipCompilerLogger.assert(!this._generated, true, "Function already generated.");
        let triggers = this.listeners.get(spriteID);

        if (triggers === undefined) {
            triggers = [];
            this.listeners.set(spriteID, triggers);
        }

        triggers.push({ func, priority: priority ?? 0 });
        triggers.sort((a, b) => a.priority - b.priority);
    }

    public createTriggerFunction(): SpiderFunctionDefinition {
        CatnipCompilerLogger.assert(!this._generated, true, "Function already generated.");

        let threadListPtrVarRef: SpiderLocalParameterReference;

        if (this.writeThreadList) {
            threadListPtrVarRef = this.triggerFunction.getParameter(0);
        }

        const targetVarRef = this.triggerFunction.addLocalVariable(SpiderNumberType.i32);

        this.triggerFunction.body.emitConstant(SpiderNumberType.i32, this.module.runtimeInstance.ptr);
        this.triggerFunction.body.emit(SpiderOpcodes.i32_load, 2, CatnipWasmStructRuntime.getMemberOffset("targets"));
        this.triggerFunction.body.emit(SpiderOpcodes.local_set, targetVarRef);

        this.triggerFunction.body.emitBlock(block => {
            block.emitLoop(loop => {
                // Break if target is null
                loop.emit(SpiderOpcodes.local_get, targetVarRef);
                loop.emit(SpiderOpcodes.i32_eqz);
                loop.emit(SpiderOpcodes.br_if, 1);

                // Get the pointer to the sprite of this target
                const spriteVarRef = this.triggerFunction!.addLocalVariable(SpiderNumberType.i32);
                loop.emit(SpiderOpcodes.local_get, targetVarRef);
                loop.emit(SpiderOpcodes.i32_load, 2, CatnipWasmStructTarget.getMemberOffset("sprite"));
                loop.emit(SpiderOpcodes.local_set, spriteVarRef);

                loop.emitBlock(innerBlock => {
                    for (const [spriteID, listeners] of this.listeners) {
                        const sprite = this.module.project.getSprite(spriteID);

                        // Check to see if this target is an instance of the sprite
                        innerBlock.emit(SpiderOpcodes.local_get, spriteVarRef);
                        innerBlock.emitConstant(SpiderNumberType.i32, sprite.structWrapper.ptr);
                        innerBlock.emit(SpiderOpcodes.i32_eq);

                        innerBlock.emitIf(ifTrue => {
                            // If it is, create the threads
                            for (const listener of listeners) {
                                ifTrue.emit(SpiderOpcodes.local_get, targetVarRef);
                                ifTrue.emitConstant(SpiderNumberType.i32, this.module.getFunctionTableIndex(listener.func));
                                if (this.writeThreadList) ifTrue.emit(SpiderOpcodes.local_get, threadListPtrVarRef);
                                else ifTrue.emitConstant(SpiderNumberType.i32, 0);
                                ifTrue.emit(SpiderOpcodes.call, this.module.getRuntimeFunction("catnip_target_start_new_thread"));
                            }
                            // Skip to the end of "innerBlock"
                            ifTrue.emit(SpiderOpcodes.br, 1);
                        });
                    }
                });

                // Get the pointer to the next target
                loop.emit(SpiderOpcodes.local_get, targetVarRef);
                loop.emit(SpiderOpcodes.i32_load, 2, CatnipWasmStructTarget.getMemberOffset("next_global"));
                loop.emit(SpiderOpcodes.local_set, targetVarRef);

                loop.emit(SpiderOpcodes.br, 0);
            });
        });

        return this.triggerFunction;
    }
}

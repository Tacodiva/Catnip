import { CatnipCompiler } from "../CatnipCompiler";
import { CatnipCompilerSubsystem } from "../CatnipCompilerSubsystem";
import { CatnipIrScriptBroadcastTrigger } from "../ir/event/broadcast_trigger";
import { CatnipSpriteID } from '../../runtime/CatnipSprite';
import { SpiderFunction, SpiderFunctionDefinition, SpiderNumberType, SpiderOpcodes } from "wasm-spider";
import { CatnipWasmStructRuntime } from "../../wasm-interop/CatnipWasmStructRuntime";
import { CatnipWasmStructTarget } from "../../wasm-interop/CatnipWasmStructTarget";

class BroadcastInfo {
    public readonly name: string;
    public readonly subsystem: CatnipCompilerBroadcastSubsystem;
    public readonly triggers: Map<CatnipSpriteID, CatnipIrScriptBroadcastTrigger[]>;

    public readonly eventFunction: SpiderFunctionDefinition;

    public constructor(subsystem: CatnipCompilerBroadcastSubsystem, name: string) {
        this.name = name;
        this.subsystem = subsystem;
        this.triggers = new Map();
        this.eventFunction = this.subsystem.compiler.spiderModule.createFunction();
    }

    public addTrigger(trigger: CatnipIrScriptBroadcastTrigger) {
        let triggers = this.triggers.get(trigger.ir.spriteID);

        if (triggers === undefined) {
            triggers = [];
            this.triggers.set(trigger.ir.spriteID, triggers);
        }

        triggers.push(trigger);
        triggers.sort((a, b) => a.inputs.priority - b.inputs.priority);
    }

    public createEventFunction(): SpiderFunctionDefinition {
        const runtimePtrVarRef = this.eventFunction.addParameter(SpiderNumberType.i32);
        const threadListPtrVarRef = this.eventFunction.addParameter(SpiderNumberType.i32);

        const targetVarRef = this.eventFunction.addLocalVariable(SpiderNumberType.i32);

        this.eventFunction.body.emit(SpiderOpcodes.local_get, runtimePtrVarRef);
        this.eventFunction.body.emit(SpiderOpcodes.i32_load, 2, CatnipWasmStructRuntime.getMemberOffset("targets"));
        this.eventFunction.body.emit(SpiderOpcodes.local_set, targetVarRef);

        this.eventFunction.body.emitBlock(block => {
            block.emitLoop(loop => {
                // Break if target is null
                loop.emit(SpiderOpcodes.local_get, targetVarRef);
                loop.emit(SpiderOpcodes.i32_eqz);
                loop.emit(SpiderOpcodes.br_if, 1);



                // Get the pointer to the sprite of this target
                const spriteVarRef = this.eventFunction!.addLocalVariable(SpiderNumberType.i32);
                loop.emit(SpiderOpcodes.local_get, targetVarRef);
                loop.emit(SpiderOpcodes.i32_load, 2, CatnipWasmStructTarget.getMemberOffset("sprite"));
                loop.emit(SpiderOpcodes.local_set, spriteVarRef);

                loop.emitBlock(innerBlock => {
                    for (const [spriteID, triggers] of this.triggers) {
                        const sprite = this.subsystem.compiler.project.getSprite(spriteID);

                        // Check to see if this target is an instance of the sprite
                        innerBlock.emit(SpiderOpcodes.local_get, spriteVarRef);
                        innerBlock.emitConstant(SpiderNumberType.i32, sprite.structWrapper.ptr);
                        innerBlock.emit(SpiderOpcodes.i32_eq);

                        innerBlock.emitIf(ifTrue => {
                            // If it is, create the threads
                            for (const trigger of triggers) {
                                ifTrue.emit(SpiderOpcodes.local_get, targetVarRef);
                                ifTrue.emitConstant(SpiderNumberType.i32, trigger.ir.entrypoint.functionTableIndex);
                                ifTrue.emit(SpiderOpcodes.local_get, threadListPtrVarRef);
                                ifTrue.emit(SpiderOpcodes.call, this.subsystem.compiler.getRuntimeFunction("catnip_target_start_new_thread"));
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

        return this.eventFunction;
    }
}

export class CatnipCompilerBroadcastSubsystem extends CatnipCompilerSubsystem {

    private readonly _broadcastTriggers: Map<string, BroadcastInfo>;
    private readonly _broadcastGeneric: SpiderFunctionDefinition;

    public constructor(compiler: CatnipCompiler) {
        super(compiler);
        this._broadcastTriggers = new Map();
        this._broadcastGeneric = this.compiler.spiderModule.createFunction();
    }

    private _getBroadcastInfo(name: string) {
        name = name.toLowerCase();
        let broadcastInfo = this._broadcastTriggers.get(name);

        if (broadcastInfo === undefined) {
            broadcastInfo = new BroadcastInfo(this, name);
            this._broadcastTriggers.set(name, broadcastInfo);
        }

        return broadcastInfo;
    }

    public registerBroadcastTrigger(trigger: CatnipIrScriptBroadcastTrigger) {
        this._getBroadcastInfo(trigger.inputs.name).addTrigger(trigger);
    }

    public getBroadcastFunction(name: string): SpiderFunction {
        return this._getBroadcastInfo(name).eventFunction;
    }

    public getGenericBroadcastFunction(): SpiderFunction {
        return this._broadcastGeneric;
    }

    public addEvents(): void {
        const broadcastName = this._broadcastGeneric.addParameter(SpiderNumberType.i32);
        const runtimePtrVarRef = this._broadcastGeneric.addParameter(SpiderNumberType.i32);
        const threadListPtrVarRef = this._broadcastGeneric.addParameter(SpiderNumberType.i32);

        for (const broadcastInfo of this._broadcastTriggers.values()) {
            const eventFunc = broadcastInfo.createEventFunction();
            this.compiler.addEvent("broadcast_" + broadcastInfo.name, eventFunc);

            this._broadcastGeneric.body.emit(SpiderOpcodes.local_get, broadcastName);
            this._broadcastGeneric.body.emitConstant(
                SpiderNumberType.i32,
                this.compiler.runtimeModule.allocateHeapString(broadcastInfo.name)
            );
            this._broadcastGeneric.body.emit(
                SpiderOpcodes.call,
                this.compiler.getRuntimeFunction("catnip_blockutil_hstring_cmp")
            );
            this._broadcastGeneric.body.emit(SpiderOpcodes.i32_eqz);

            this._broadcastGeneric.body.emitIf((trueBody) => {
                trueBody.emit(SpiderOpcodes.local_get, runtimePtrVarRef);
                trueBody.emit(SpiderOpcodes.local_get, threadListPtrVarRef);
                trueBody.emit(SpiderOpcodes.call, eventFunc);
                trueBody.emit(SpiderOpcodes.return);
            });
        }
    }
}
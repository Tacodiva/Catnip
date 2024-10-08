import { SpiderFunctionDefinition, SpiderNumberType, SpiderOpcodes } from "wasm-spider";
import { CatnipEventID } from "../../CatnipEvents";
import { CatnipSpriteID } from "../../runtime/CatnipSprite";
import { CatnipCompiler } from "../CatnipCompiler";
import { CatnipCompilerSubsystem } from "../CatnipCompilerSubsystem";
import { CatnipIrScriptEventTrigger } from "../ir/core/event_trigger";
import { CatnipWasmStructTarget } from "../../wasm-interop/CatnipWasmStructTarget";
import { CatnipWasmStructRuntime } from "../../wasm-interop/CatnipWasmStructRuntime";

class EventInfo {
    public readonly subsystem: CatnipCompilerEventTriggerSubsystem;
    public readonly id: CatnipEventID;
    private readonly _triggers: Map<CatnipSpriteID, CatnipIrScriptEventTrigger[]>;

    private readonly _function: SpiderFunctionDefinition;

    public constructor(subsystem: CatnipCompilerEventTriggerSubsystem, id: CatnipEventID) {
        this.subsystem = subsystem;
        this._triggers = new Map();
        this.id = id;
        this._function = this.subsystem.compiler.spiderModule.createFunction();
    }

    public addTrigger(trigger: CatnipIrScriptEventTrigger) {
        let triggers = this._triggers.get(trigger.ir.spriteID);

        if (triggers === undefined) {
            triggers = [];
            this._triggers.set(trigger.ir.spriteID, triggers);
        }

        triggers.push(trigger);
        triggers.sort((a, b) => a.inputs.priority - b.inputs.priority);
    }

    public addEvent() {
        const targetVarRef = this._function.addLocalVariable(SpiderNumberType.i32);

        this._function.body.emitConstant(SpiderNumberType.i32, this.subsystem.compiler.runtimeInstance.ptr);
        this._function.body.emit(SpiderOpcodes.i32_load, 2, CatnipWasmStructRuntime.getMemberOffset("targets"));
        this._function.body.emit(SpiderOpcodes.local_set, targetVarRef);

        this._function.body.emitBlock(block => {
            block.emitLoop(loop => {
                // Break if target is null
                loop.emit(SpiderOpcodes.local_get, targetVarRef);
                loop.emit(SpiderOpcodes.i32_eqz);
                loop.emit(SpiderOpcodes.br_if, 1);

                // Get the pointer to the sprite of this target
                const spriteVarRef = this._function!.addLocalVariable(SpiderNumberType.i32);
                loop.emit(SpiderOpcodes.local_get, targetVarRef);
                loop.emit(SpiderOpcodes.i32_load, 2, CatnipWasmStructTarget.getMemberOffset("sprite"));
                loop.emit(SpiderOpcodes.local_set, spriteVarRef);

                loop.emitBlock(innerBlock => {
                    for (const [spriteID, triggers] of this._triggers) {
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
                                ifTrue.emitConstant(SpiderNumberType.i32, 0);
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

        this.subsystem.compiler.addEventListener(this.id, this._function);
    }
}

export class CatnipCompilerEventTriggerSubsystem extends CatnipCompilerSubsystem {
    private readonly _triggers: Map<CatnipEventID, EventInfo>;

    public constructor(compiler: CatnipCompiler) {
        super(compiler);
        this._triggers = new Map();
    }

    public addTrigger(trigger: CatnipIrScriptEventTrigger) {
        let eventInfo = this._triggers.get(trigger.inputs.id);

        if (eventInfo === undefined) {
            eventInfo = new EventInfo(this, trigger.inputs.id);
            this._triggers.set(trigger.inputs.id, eventInfo);
        }

        eventInfo.addTrigger(trigger);
    }

    public addEvents(): void {
        for (const eventInfo of this._triggers.values())
            eventInfo.addEvent();
    }
}
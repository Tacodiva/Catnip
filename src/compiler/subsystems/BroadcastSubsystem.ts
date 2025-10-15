import { CatnipCompilerModuleSubsystem } from "../CatnipCompilerSubsystem";
import { CatnipIrScriptBroadcastTrigger } from "../ir/event/broadcast_trigger";
import { SpiderFunction, SpiderFunctionDefinition, SpiderNumberType, SpiderOpcodes } from "wasm-spider";
import { CatnipCompilerWasmTrigger } from "../wasm/CatnipCompilerWasmTrigger";
import { CatnipCompilerWasmModule } from "../wasm/CatnipCompilerWasmModule";

interface BroadcastTriggerInfo {
    triggerGenerator: CatnipCompilerWasmTrigger,
    broadcastName: string
}

export class BroadcastSubsystem extends CatnipCompilerModuleSubsystem {

    private readonly _broadcastTriggers: Map<string, BroadcastTriggerInfo>;
    private readonly _broadcastGeneric: SpiderFunctionDefinition;

    public constructor(module: CatnipCompilerWasmModule) {
        super(module);
        this._broadcastTriggers = new Map();
        this._broadcastGeneric = this.spiderModule.createFunction();
    }

    private _getBroadcastInfo(name: string) {
        name = name.toLowerCase();
        let broadcastInfo = this._broadcastTriggers.get(name);

        if (broadcastInfo === undefined) {
            broadcastInfo = {
                broadcastName: name,
                triggerGenerator: new CatnipCompilerWasmTrigger(this.compiler, true)
            };
            this._broadcastTriggers.set(name, broadcastInfo);
        }

        return broadcastInfo;
    }

    public registerBroadcastTrigger(trigger: CatnipIrScriptBroadcastTrigger) {
        this._getBroadcastInfo(trigger.inputs.name).triggerGenerator.addListener(trigger);
    }

    public getBroadcastFunction(name: string): SpiderFunction {
        return this._getBroadcastInfo(name).triggerGenerator.triggerFunction;
    }

    public getGenericBroadcastFunction(): SpiderFunction {
        return this._broadcastGeneric;
    }

    public preModuleWrite(): void {
        const broadcastName = this._broadcastGeneric.addParameter(SpiderNumberType.i32);
        const threadListPtrVarRef = this._broadcastGeneric.addParameter(SpiderNumberType.i32);

        for (const broadcastInfo of this._broadcastTriggers.values()) {
            const eventFunc = broadcastInfo.triggerGenerator.createTriggerFunction();

            this._broadcastGeneric.body.emit(SpiderOpcodes.local_get, broadcastName);
            this._broadcastGeneric.body.emitConstant(
                SpiderNumberType.i32,
                this.compiler.runtimeModule.createCanonHString(broadcastInfo.broadcastName)
            );
            this._broadcastGeneric.body.emit(
                SpiderOpcodes.call,
                this.module.getRuntimeFunction("catnip_blockutil_hstring_cmp")
            );
            this._broadcastGeneric.body.emit(SpiderOpcodes.i32_eqz);

            this._broadcastGeneric.body.emitIf((trueBody) => {
                trueBody.emit(SpiderOpcodes.local_get, threadListPtrVarRef);
                trueBody.emit(SpiderOpcodes.call, eventFunc);
                trueBody.emit(SpiderOpcodes.return);
            });
        }
    }
}
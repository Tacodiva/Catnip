import { SpiderFunction, SpiderFunctionDefinition, SpiderNumberType, SpiderOpcodes } from "wasm-spider";
import { CatnipSpriteID } from "../../runtime/CatnipSprite";
import { CatnipCompilerModuleSubsystem } from "../CatnipCompilerModuleSubsystem";
import { CatnipCompilerWasmModule } from "../wasm/CatnipCompilerWasmModule";
import { CatnipCompilerWasmTrigger } from "../wasm/CatnipCompilerWasmTrigger";
import { CatnipCompilerWasmEventFilter } from "../wasm/CatnipCompilerWasmEvent";


export class BroadcastSubsystem extends CatnipCompilerModuleSubsystem {

    private readonly _broadcastTriggers: Map<string, CatnipCompilerWasmTrigger>;
    private _broadcastGeneric: SpiderFunctionDefinition | null;

    public constructor(module: CatnipCompilerWasmModule) {
        super(module);
        this._broadcastTriggers = new Map();
        this._broadcastGeneric = null;
    }

    private _getBroadcastTriggerGenerator(broadcastName: string) {
        broadcastName = broadcastName.toLowerCase();
        let triggerGenerator = this._broadcastTriggers.get(broadcastName);

        if (triggerGenerator === undefined) {
            triggerGenerator = new CatnipCompilerWasmTrigger(this.module, true);
            this._broadcastTriggers.set(broadcastName, triggerGenerator);
        }

        return triggerGenerator;
    }

    public addBroadcastListener(broadcastName: string, spriteID: CatnipSpriteID, listener: SpiderFunction) {
        this._getBroadcastTriggerGenerator(broadcastName).addListener(listener, spriteID);
    }

    public getBroadcastFunction(broadcastName: string): SpiderFunction {
        return this._getBroadcastTriggerGenerator(broadcastName).triggerFunction;
    }

    public getGenericBroadcastFunction(): SpiderFunctionDefinition {
        this._broadcastGeneric ??= this.spiderModule.createFunction();
        return this._broadcastGeneric;
    }

    public preModuleWrite(): void {
        for (const trigger of this._broadcastTriggers.values()) {
            trigger.createTriggerFunction();
        }

        if (this._broadcastGeneric !== null || this.module.hasEvent("PROJECT_BROADCAST")) {
            
            this._broadcastGeneric = this.getGenericBroadcastFunction();
            
            const broadcastNameParameter = this._broadcastGeneric.addParameter(SpiderNumberType.i32);
            const threadPtr = this._broadcastGeneric.addParameter(SpiderNumberType.i32);

            for (const [broadcastName, triggerGenerator] of this._broadcastTriggers) {

                this._broadcastGeneric.body.emit(SpiderOpcodes.local_get, broadcastNameParameter);
                this._broadcastGeneric.body.emitConstant(
                    SpiderNumberType.i32,
                    this.compiler.runtimeModule.createCanonHString(broadcastName)
                );
                this._broadcastGeneric.body.emit(
                    SpiderOpcodes.call,
                    this.module.getRuntimeFunction("catnip_blockutil_hstring_cmp")
                );
                this._broadcastGeneric.body.emit(SpiderOpcodes.i32_eqz);

                this._broadcastGeneric.body.emitIf((trueBody) => {
                    trueBody.emit(SpiderOpcodes.local_get, threadPtr);
                    trueBody.emit(SpiderOpcodes.call, triggerGenerator.triggerFunction);
                    trueBody.emit(SpiderOpcodes.return);
                });
            }

            if (this.module.hasEvent("PROJECT_BROADCAST")) {
                // We only want to call this on external calls because otherwise when we broadcasted something
                //   using the generic 
                this.module.addEventListener(
                    "PROJECT_BROADCAST", this._broadcastGeneric,
                    CatnipCompilerWasmEventFilter.EXTERNAL_ONLY, true
                );
            }
        }
    }
}
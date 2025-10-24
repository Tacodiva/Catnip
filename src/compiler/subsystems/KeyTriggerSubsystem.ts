import { SpiderFunction, SpiderNumberType, SpiderOpcodes } from "wasm-spider";
import { CatnipSpriteID } from "../../runtime/CatnipSprite";
import { CatnipCompilerModuleSubsystem } from "../CatnipCompilerModuleSubsystem";
import { CatnipCompilerWasmModule } from "../wasm/CatnipCompilerWasmModule";
import { CatnipCompilerWasmTrigger } from "../wasm/CatnipCompilerWasmTrigger";


export class KeyTriggerSubsystem extends CatnipCompilerModuleSubsystem {
    // A map of key codes to the function to call to trigger the hats for that key
    private _keyMap: Map<number, CatnipCompilerWasmTrigger>;
    // The trigger when any key is pressed.
    private _anyKey: CatnipCompilerWasmTrigger | null;

    public constructor(module: CatnipCompilerWasmModule) {
        super(module);
        this._keyMap = new Map();
        this._anyKey = null;
    }

    private _getTriggerFunctionGenerator(key: number | null): CatnipCompilerWasmTrigger {
        if (key === null) {
            if (this._anyKey === null)
                this._anyKey = new CatnipCompilerWasmTrigger(this.module, false);
            return this._anyKey;
        }

        let generator = this._keyMap.get(key);

        if (generator === undefined) {
            generator = new CatnipCompilerWasmTrigger(this.module, false);
            this._keyMap.set(key, generator);
        }

        return generator;
    }

    public addKeyListener(key: number | null, spriteID: CatnipSpriteID, listener: SpiderFunction) {
        this._getTriggerFunctionGenerator(key).addListener(listener, spriteID);
    }

    public preModuleWrite(): void {

        const eventFunction = this.spiderModule.createFunction({
            parameters: [SpiderNumberType.i32] // Key code
        });

        eventFunction.body.emitBlock(body => {
            for (const [keyCode, generator] of this._keyMap) {
                const triggerFunction = generator.createTriggerFunction();

                body.emit(SpiderOpcodes.local_get, eventFunction.getParameter(0));
                body.emitConstant(SpiderNumberType.i32, keyCode);
                body.emit(SpiderOpcodes.i32_eq);
                body.emitIf((body) => {
                    body.emit(SpiderOpcodes.call, triggerFunction);
                    // Break out of the block
                    body.emit(SpiderOpcodes.br, 1);
                });
            }
        });

        if (this._anyKey) {
            const anyEventFunction = this._anyKey.createTriggerFunction();
            eventFunction.body.emit(SpiderOpcodes.call, anyEventFunction);
        }

        this.module.addEventListener("IO_KEY_PRESSED", eventFunction);
    }

}
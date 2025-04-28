import { SpiderNumberType, SpiderOpcodes } from "wasm-spider";
import { CatnipCompiler } from "../CatnipCompiler";
import { CatnipCompilerSubsystem } from "../CatnipCompilerSubsystem";
import { CatnipTriggerFunctionGenerator } from "../CatnipTriggerGenerator";
import { CatnipIrScriptKeyPressedTrigger } from "../ir/event/key_pressed_trigger";


export class CatnipCompilerKeyTriggerSubsystem extends CatnipCompilerSubsystem {
    // A map of key codes to the function to call to trigger the hats for that key
    private _keyMap: Map<number, CatnipTriggerFunctionGenerator>;
    // The trigger when any key is pressed.
    private _anyKey: CatnipTriggerFunctionGenerator | null;

    public constructor(compiler: CatnipCompiler) {
        super(compiler);
        this._keyMap = new Map();
        this._anyKey = null;
    }

    private _getTriggerFunctionGenerator(key: number | null): CatnipTriggerFunctionGenerator {
        if (key === null) {
            if (this._anyKey === null)
                this._anyKey = new CatnipTriggerFunctionGenerator(this.compiler, false);
            return this._anyKey;
        }

        let generator = this._keyMap.get(key);

        if (generator === undefined) {
            generator = new CatnipTriggerFunctionGenerator(this.compiler, false);
            this._keyMap.set(key, generator);
        }

        return generator;
    }

    public registerTrigger(trigger: CatnipIrScriptKeyPressedTrigger) {
        this._getTriggerFunctionGenerator(trigger.inputs.key).addTrigger(trigger);
    }

    public addEvents(): void {

        const eventFunction = this.spiderModule.createFunction({
            parameters: [SpiderNumberType.i32] // Key code
        });

        eventFunction.body.emitBlock(body => {
            for (const [keyCode, generator] of this._keyMap) {
                const eventFunction = generator.createEventFunction();

                body.emit(SpiderOpcodes.local_get, eventFunction.getParameter(0));
                body.emitConstant(SpiderNumberType.i32, keyCode);
                body.emit(SpiderOpcodes.i32_eq);
                body.emitIf((body) => {
                    body.emit(SpiderOpcodes.call, eventFunction);
                    // Break out of the block
                    body.emit(SpiderOpcodes.br, 1);
                });
            }
        });

        if (this._anyKey) {
            const anyEventFunction = this._anyKey.createEventFunction();
            eventFunction.body.emit(SpiderOpcodes.call, anyEventFunction);
        }

        this.compiler.addEventListener("IO_KEY_PRESSED", eventFunction);
    }

}
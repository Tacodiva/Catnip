import { CatnipWasmEnumThreadStatus } from "../../wasm-interop/CatnipWasmEnumThreadStatus";
import { CatnipCompilerLogger } from "../CatnipCompilerLogger";
import { IR1, IR1Script } from "../ir1/IR1";
import { IR0, IR0Script, IR0ScriptInfo } from "./IR0";
import { IR0ControlFlowType } from "./IR0ControlFlow";

export interface ScriptInfo {
    ir0: IR0Script;
    ir1: IR1Script;

    isYielding: boolean;
}

export class IR0ToIR1Info {

    public readonly ir0: IR0;
    public readonly ir1: IR1;

    private _scripts: Map<IR0Script, ScriptInfo>;

    public constructor(ir0: IR0, ir1: IR1) {
        this.ir0 = ir0;
        this.ir1 = ir1;
        this._scripts = new Map();
    }

    public create() {
        for (const ir0Script of this.ir0.scripts) {
            const ir1Script = new IR1Script(
                this.ir1, ir0Script.trigger.toIR1(), ir0Script.spriteID
            );

            this._scripts.set(ir0Script, {
                ir0: ir0Script,
                ir1: ir1Script,
                isYielding: false
            });
        }

        const checkingScripts: Set<IR0Script> = new Set();
        const checkedScripts: Set<IR0Script> = new Set();

        // Figure out which scripts are yielding, this is needed for converitng to IR1.
        
        const isScriptYielding = (script: IR0Script): boolean => {

            if (checkingScripts.has(script)) {
                // Recursion. Recursion yields
                return true;
            }

            if (checkedScripts.has(script)) {
                return this.getScriptInfo(script).isYielding;
            }

            checkingScripts.add(script);

            let isYielding = false;

            script.forEachBasicBlock(block => {
                const flow = block.flow;
                switch (flow.type) {
                    case IR0ControlFlowType.Next:
                        if (flow.status !== CatnipWasmEnumThreadStatus.RUNNING)
                            isYielding = true;
                        break;
                    case IR0ControlFlowType.Call:
                        if (isScriptYielding(flow.procedure))
                            isYielding = true;
                        break;
                }
            });

            checkingScripts.delete(script);
            checkedScripts.add(script);

            this.getScriptInfo(script).isYielding = isYielding;

            return isYielding;
        };

        for (const ir0Script of this.ir0.scripts) {
            isScriptYielding(ir0Script);
        }
    }

    public getScriptInfo(script: IR0Script) {
        let scriptInfo = this._scripts.get(script);
        CatnipCompilerLogger.assert(scriptInfo !== undefined);
        return scriptInfo;
    }


}
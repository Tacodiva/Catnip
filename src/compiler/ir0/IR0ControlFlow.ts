import { CatnipWasmEnumThreadStatus } from "../../wasm-interop/CatnipWasmEnumThreadStatus";
import { IR0InputReference } from "./IR0Node";
import { IR0Script } from "./IR0Script";
import { IR0BasicBlock } from "./IR0BasicBlock";


export enum IR0ControlFlowType {
    Next, // Flow onto the next block
    Condition, // Flow onto block if condition is true, otherwise flow onto a different block

    Call, // Call a prodecure
    Return, // Terminate this procedure, and return to the caller (if applicable)
}

export interface IR0ControlFlowNext {
    type: IR0ControlFlowType.Next,
    status: CatnipWasmEnumThreadStatus,
    next: IR0BasicBlock,
}

export interface IR0ControlFlowCondition {
    type: IR0ControlFlowType.Condition,
    condition: IR0InputReference
    pass: IR0BasicBlock,
    fail: IR0BasicBlock,
}

export interface IR0ControlFlowCall {
    type: IR0ControlFlowType.Call,
    args: IR0InputReference[],
    procedure: IR0Script,
    next: IR0BasicBlock
}

export interface IR0ControlFlowReturn {
    type: IR0ControlFlowType.Return;
}

export type IR0ControlFlow =
    IR0ControlFlowNext |
    IR0ControlFlowCondition |
    IR0ControlFlowCall |
    IR0ControlFlowReturn;

export const IR0ControlFlow = new class {

    public forEachInput(flow: IR0ControlFlow, iterator: (input: IR0InputReference) => void) {
        switch (flow.type) {
            case IR0ControlFlowType.Call:
                flow.args.forEach(iterator);
                break;
            case IR0ControlFlowType.Condition:
                iterator(flow.condition);
                break;
        }
    }
};
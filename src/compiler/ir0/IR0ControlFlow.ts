import { CatnipWasmEnumThreadStatus } from "../../wasm-interop/CatnipWasmEnumThreadStatus";
import { IR0Input, IR0Script } from "./IR0";
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
    condition: IR0Input
    pass: IR0BasicBlock,
    fail: IR0BasicBlock,
}

export interface IR0ControlFlowCall {
    type: IR0ControlFlowType.Call,
    args: IR0Input[],
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

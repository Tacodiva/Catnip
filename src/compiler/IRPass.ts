import { IR0 } from "./ir0/IR0";
import { IR1 } from "./ir1/IR1";

export enum IRType {
    IR0,
    IR1
}

export interface IR0Pass {
    readonly type: IRType.IR0;
    readonly priority: number;

    /**
     * @returns If this pass modified the IR.
     */
    execute(ir: IR0): boolean;
}


export interface IR1Pass {
    readonly type: IRType.IR1;
    readonly priority: number;

    /**
     * @returns If this pass modified the IR.
     */
    execute(ir: IR1): boolean;
}

export type IRPass = IR0Pass | IR1Pass;
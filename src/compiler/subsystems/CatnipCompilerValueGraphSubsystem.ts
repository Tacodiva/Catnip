import { CatnipCompiler } from "../CatnipCompiler";
import { CatnipCompilerSubsystem } from "../CatnipCompilerSubsystem";
import { CatnipVariable } from '../../runtime/CatnipVariable';
import { CatnipCompilerValue } from "../CatnipCompilerValue";
import { CatnipIrOp } from "../CatnipIrOp";
import { CatnipIrFunction } from "../CatnipIrFunction";

export enum ValueGraphAccessType {
    READ,
    WRITE,
}

export interface ValueGraphAccessNode {

    type: ValueGraphAccessType;
    value: CatnipCompilerValue;
    op: CatnipIrOp;
    prev: ValueGraphAccessNode[];
    next: ValueGraphAccessNode[];
    
}

export class ValueGraphVariableInfo {
    public value: CatnipCompilerValue;
    public accesses: ValueGraphAccessNode[];

    public constructor(value: CatnipCompilerValue, accesses: ValueGraphAccessNode[]) {
        this.value = value;
        this.accesses = accesses;
    }

    public or(other: ValueGraphVariableInfo): ValueGraphVariableInfo {   
        return new ValueGraphVariableInfo(this.value.or(other.value), [...this.accesses, ...other.accesses]);
    }
}

export interface ValueGraphFuncInfo {
    entryVariables: Map<CatnipVariable, ValueGraphVariableInfo>;
    exitVariables: Map<CatnipVariable, ValueGraphVariableInfo>;
    entryArguments: ValueGraphVariableInfo[];
}

export interface ValueGraph {

    variables: Map<CatnipVariable, ValueGraphVariableInfo>;
    functions: Map<CatnipIrFunction, ValueGraphFuncInfo>;

}

export class CatnipCompilerValueGraphSubsystem extends CatnipCompilerSubsystem {

    public constructor(compiler: CatnipCompiler) {
        super(compiler);
    }


}

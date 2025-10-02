import { CatnipCompilerPassContext } from '../CatnipCompilerPassContext';
import { CatnipCompilerValue } from "../CatnipCompilerValue";
import { CatnipValueFormat } from "../CatnipValueFormat";
import { CatnipValueFormatUtils } from "../CatnipValueFormatUtils";
import { CatnipIrFunction } from "../CatnipIrFunction";
import { CatnipVariable } from "../../runtime/CatnipVariable";
import { CatnipCompilerLogger } from "../CatnipCompilerLogger";
import { CatnipIrBasicBlock } from "../CatnipIrBasicBlock";
import { CatnipIrOp } from "../CatnipIrOp";
import { analyzeBlockStack, OperatorStackAnalysis } from "./StackAnalysis";
import { CatnipIrBranch, CatnipIrBranchType } from "../CatnipIrBranch";
import { CatnipIrTransientVariable } from '../CatnipIrTransientVariable';

export enum ValueGraphAccessType {
    READ,
    WRITE,
}

export enum ValueGraphVariableType {
    VARIABLE,
    PARAMETER,
    TRANSIENT
}

export type ValueGraphVariable = {
    readonly type: ValueGraphVariableType.VARIABLE,
    readonly variable: CatnipVariable,
} | {
    readonly type: ValueGraphVariableType.PARAMETER,
    readonly index: number,
} | {
    readonly type: ValueGraphVariableType.TRANSIENT,
    readonly transient: CatnipIrTransientVariable
};

export type ValueGraphAccessInfo = ({
    readonly type: ValueGraphAccessType.WRITE;
    readonly value: CatnipCompilerValue;
} | {
    readonly type: ValueGraphAccessType.READ;
}) & {
    readonly variable: ValueGraphVariable;
}

export interface ValueGraphAccessNode {
    readonly op: CatnipIrOp;
    readonly type: ValueGraphAccessType;
    readonly value: CatnipCompilerValue;
    readonly prev: ReadonlySet<ValueGraphAccessNode>;
    readonly next: ReadonlySet<ValueGraphAccessNode>;
}

export interface ValueGraphValueInfo {
    readonly value: CatnipCompilerValue;
    readonly prev: ReadonlySet<ValueGraphAccessNode>;
}

interface WritableValueGraphValueInfo extends ValueGraphValueInfo {
    value: CatnipCompilerValue;
    prev: Set<ValueGraphAccessNode>;
}

export class ValueGraph {

    public readonly nodes: ReadonlyMap<CatnipIrOp, ValueGraphAccessNode>;
    public readonly variables: ReadonlyMap<CatnipVariable, ValueGraphValueInfo>;
    public readonly transients: ReadonlyMap<CatnipIrTransientVariable, ValueGraphValueInfo>;
    public readonly stackAnalysis: ReadonlyMap<CatnipIrOp, OperatorStackAnalysis>;

    public constructor(
        nodes: ReadonlyMap<CatnipIrOp, ValueGraphAccessNode>,
        variables: ReadonlyMap<CatnipVariable, ValueGraphValueInfo>,
        transients: ReadonlyMap<CatnipIrTransientVariable, ValueGraphValueInfo>,
        stackAnalysis: ReadonlyMap<CatnipIrOp, OperatorStackAnalysis>
    ) {
        this.nodes = nodes;
        this.variables = variables;
        this.transients = transients;
        this.stackAnalysis = stackAnalysis;
    }

    public toString(): string {
        let stringified = "";

        function stringifyInfo(info: ValueGraphValueInfo) {
            let stringified = "";

            const nodes: ValueGraphAccessNode[] = [];

            function getNodeIndex(node: ValueGraphAccessNode): number {
                let nodeName = nodes.indexOf(node) + 1;
                if (nodeName === 0) nodeName = nodes.push(node);
                return nodeName
            }

            function stringifyNode(node: ValueGraphAccessNode): string {
                if (node.type === ValueGraphAccessType.READ) {
                    return `Node #${getNodeIndex(node)} ('${node.op.block.func.name}' READ)`;
                } else {
                    return `Node #${getNodeIndex(node)} ('${node.op.block.func.name}' WRITE ${node.value})`;
                }
            }

            for (const nextNode of info.prev) {
                stringified += ` <= ${stringifyNode(nextNode)}\n`;
            }

            const readyNodes: Set<ValueGraphAccessNode> = new Set(info.prev);
            const todoNodes: ValueGraphAccessNode[] = [...info.prev];

            while (todoNodes.length != 0) {

                const node = todoNodes.pop()!;

                stringified += '\n' + stringifyNode(node) + '\n';

                for (const nextNode of node.next) {
                    stringified += ` => ${stringifyNode(nextNode)}\n`;
                    if (!readyNodes.has(nextNode)) {
                        readyNodes.add(nextNode);
                        todoNodes.push(nextNode);
                    }
                }
            }

            return stringified;
        }

        for (const [variable, info] of this.variables) {
            stringified += `\n\n===== VARIABLE '${variable.name}' ${info.value} =====\n`;
            stringified += stringifyInfo(info);
        }

        return stringified;
    }
}

interface WriteableValueGraphAccessNode extends ValueGraphAccessNode {
    op: CatnipIrOp;
    type: ValueGraphAccessType;
    value: CatnipCompilerValue;
    prev: Set<WriteableValueGraphAccessNode>;
    next: Set<WriteableValueGraphAccessNode>;
}

class ValueGraphVariableInfo {
    public value: CatnipCompilerValue;
    public previousAccesses: Set<WriteableValueGraphAccessNode>;

    public constructor(value: CatnipCompilerValue, accesses: Set<WriteableValueGraphAccessNode>) {
        this.value = value;
        this.previousAccesses = accesses;
    }

    public isSubsetOf(other: ValueGraphVariableInfo): boolean {
        if (!this.value.isSubsetOf(other.value)) return false;

        for (const access of this.previousAccesses) {
            if (!other.previousAccesses.has(access))
                return false;
        }

        return true;
    }

    public equals(other: ValueGraphVariableInfo): boolean {
        if (!this.value.equals(other.value)) return false;

        if (this.previousAccesses.size !== other.previousAccesses.size) return false;

        for (const access of this.previousAccesses) {
            if (!other.previousAccesses.has(access))
                return false;
        }

        return true;
    }

    public or(other: ValueGraphVariableInfo): boolean {
        let modified = false;

        if (!other.value.isSubsetOf(this.value)) {
            this.value = this.value.or(other.value);
            modified = true;
        }

        for (const access of other.previousAccesses) {
            if (!this.previousAccesses.has(access)) {
                modified = true;
                this.previousAccesses.add(access);
            }
        }

        return modified;
    }

    public clone(): ValueGraphVariableInfo {
        return new ValueGraphVariableInfo(this.value, new Set(this.previousAccesses));
    }
}

export class ValueGraphStateInfo {

    private static cloneMap<T>(obj: Map<T, ValueGraphVariableInfo>): Map<T, ValueGraphVariableInfo> {
        const variables: Map<T, ValueGraphVariableInfo> = new Map();
        for (const [variable, info] of obj)
            variables.set(variable, info.clone());
        return variables;
    }

    private static cloneParameters(obj: ValueGraphVariableInfo[]): ValueGraphVariableInfo[] {
        const parameters: ValueGraphVariableInfo[] = [];
        for (const parameter of obj)
            parameters.push(parameter.clone());
        return parameters;
    }

    public readonly variables: Map<CatnipVariable, ValueGraphVariableInfo>;
    public readonly transients: Map<CatnipIrTransientVariable, ValueGraphVariableInfo>;
    public readonly parameters: ValueGraphVariableInfo[];

    public constructor(variables: Map<CatnipVariable, ValueGraphVariableInfo>, transients: Map<CatnipIrTransientVariable, ValueGraphVariableInfo>, parameters: ValueGraphVariableInfo[], clone: boolean = false) {
        this.variables = clone ? ValueGraphStateInfo.cloneMap(variables) : variables;
        this.transients = clone ? ValueGraphStateInfo.cloneMap(transients) : transients;
        this.parameters = clone ? ValueGraphStateInfo.cloneParameters(parameters) : parameters;
    }

    public isSubsetOf(other: ValueGraphStateInfo): boolean {
        CatnipCompilerLogger.assert(other.variables.size === this.variables.size);
        CatnipCompilerLogger.assert(other.parameters.length === this.parameters.length);

        for (const [variable, otherInfo] of other.variables) {
            const thisInfo = this.variables.get(variable);
            CatnipCompilerLogger.assert(thisInfo !== undefined);

            if (!thisInfo.isSubsetOf(otherInfo)) return false;
        }

        for (let i = 0; i < this.parameters.length; i++) {
            if (!this.parameters[i].isSubsetOf(other.parameters[i]))
                return false;
        }

        return true;
    }

    public equals(other: ValueGraphStateInfo): boolean {
        CatnipCompilerLogger.assert(other.variables.size === this.variables.size);
        CatnipCompilerLogger.assert(other.parameters.length === this.parameters.length);

        for (const [variable, otherInfo] of other.variables) {
            const thisInfo = this.variables.get(variable);
            CatnipCompilerLogger.assert(thisInfo !== undefined);

            if (!thisInfo.equals(otherInfo)) return false;
        }

        for (let i = 0; i < this.parameters.length; i++) {
            if (!this.parameters[i].equals(other.parameters[i]))
                return false;
        }

        return true;
    }

    public or(other: ValueGraphStateInfo): boolean {
        let modified = false;

        // All the states should have every variable
        CatnipCompilerLogger.assert(other.variables.size === this.variables.size);

        for (const [variable, otherInfo] of other.variables) {
            const thisInfo = this.variables.get(variable);
            CatnipCompilerLogger.assert(thisInfo !== undefined);

            modified = thisInfo.or(otherInfo) || modified;
        }

        // The states should also have the same number of parameters
        CatnipCompilerLogger.assert(other.parameters.length === this.parameters.length);

        for (let i = 0; i < this.parameters.length; i++) {
            modified = this.parameters[i].or(other.parameters[i]) || modified;
        }

        return modified;
    }

    public clone(): ValueGraphStateInfo {
        return new ValueGraphStateInfo(this.variables, this.transients, this.parameters, true);
    }

    public getVariableInfo(variable: ValueGraphVariable): ValueGraphVariableInfo {
        if (variable.type === ValueGraphVariableType.VARIABLE) {
            const info = this.variables.get(variable.variable);

            CatnipCompilerLogger.assert(info !== undefined);
            return info;
        }

        if (variable.type === ValueGraphVariableType.TRANSIENT) {
            let info = this.transients.get(variable.transient);

            if (info === undefined) {
                info = new ValueGraphVariableInfo(CatnipCompilerValue.none(), new Set());
                this.transients.set(variable.transient, info);
            }

            return info;
        }

        return this.parameters[variable.index];
    }
}

export function createValueGraph(ctx: CatnipCompilerPassContext): ValueGraph {

    interface FunctionInfo {
        entry: ValueGraphStateInfo;
        exit: ValueGraphStateInfo;
    }

    const functions: Map<CatnipIrFunction, FunctionInfo> = new Map();
    const variables: Map<CatnipVariable, ValueGraphVariableInfo> = new Map();

    // A list of functions which can be yielded to. These functions need to 
    //  be re-analyzed when we update global variable state.
    const yieldingFunctions: CatnipIrFunction[] = [];


    // Setup the initial state of the project by setting all the variables to whatever they are now
    for (const sprite of ctx.compiler.project.sprites) {
        for (const variable of sprite.variables) {

            const value = sprite.defaultTarget.getVariableValue(variable.id);

            let format;

            if (typeof (value) === "string") {
                format = CatnipValueFormat.F64_BOXED_I32_HSTRING;
            } else {
                format = CatnipValueFormatUtils.getNumberFormat(value);
            }

            variables.set(variable, new ValueGraphVariableInfo(
                CatnipCompilerValue.constant(value, format), new Set(),
            ));
        }
    }

    // Next, create the graph filled in with the bare minimum information
    ctx.forEachFunction(func => {

        if (func.hasFunctionTableIndex) {
            yieldingFunctions.push(func);
        }

        const entryVariables: Map<CatnipVariable, ValueGraphVariableInfo> = new Map();
        for (const variable of variables.keys()) {
            entryVariables.set(variable, new ValueGraphVariableInfo(
                CatnipCompilerValue.none(), new Set()
            ));
        }

        const entryTransients: Map<CatnipIrTransientVariable, ValueGraphVariableInfo> = new Map();

        const entryArguments: ValueGraphVariableInfo[] = [];
        for (const parameter of func.ir.parameters) {
            entryArguments.push(new ValueGraphVariableInfo(
                CatnipCompilerValue.none(), new Set()
            ));
        }

        const entryState = new ValueGraphStateInfo(entryVariables, entryTransients, entryArguments);

        functions.set(func, {
            entry: entryState,
            exit: entryState.clone()
        });
    });

    // A set of all the functions we need to analyze
    const analyzeYieldingFunctions: Set<CatnipIrFunction> = new Set();

    interface ExitState {
        // The state when we 'fall of the bottom' of what we're analysing, or null if we never fall to the bottom.
        continue: ValueGraphStateInfo | null,
        // The state when what we're analysing returns, or null if it never returns.
        return: ValueGraphStateInfo | null
    }

    function exitStatesEqual(a: ExitState, b: ExitState): boolean {
        if (a.continue === null || b.continue === null) {
            if (a.continue !== null || b.continue !== null) return false;
        } else {
            if (!a.continue.equals(b.continue)) return false;
        }

        if (a.return === null || b.return === null) {
            if (a.return !== null || b.return !== null) return false;
        } else {
            if (!a.return.equals(b.return)) return false;
        }

        return true;
    }

    function exitStateOr(dest: ExitState, or: ExitState) {
        if (dest.continue === null)
            dest.continue = or.continue;
        else if (or.continue !== null)
            dest.continue.or(or.continue);

        if (dest.return === null)
            dest.return = or.return;
        else if (or.return !== null)
            dest.return.or(or.return);
    }


    const blockAnalyses: Map<CatnipIrBasicBlock, {
        stack_analysis: Map<CatnipIrOp, OperatorStackAnalysis>,

        // The state when we enter this basic block
        entry: ValueGraphStateInfo,
        // The state when we exit this basic block or null if it is currently being analyzed.
        exit: ExitState | null,
        // When analyzing recursion, we first assume the exit state. 
        // We repeat analysis till the assumed state match the real states
        assumed_exit: ExitState | null,
    }> = new Map();

    interface OpAnalysis {
        node: WriteableValueGraphAccessNode | null,
        branch_args: Map<CatnipIrBranch, WriteableValueGraphAccessNode[]> | null,
    };

    const opAnalyses: Map<CatnipIrOp, OpAnalysis> = new Map();

    function getOpAnalysis(op: CatnipIrOp): OpAnalysis {
        let analysis = opAnalyses.get(op);

        if (analysis !== undefined) return analysis;

        analysis = {
            node: null,
            branch_args: null
        }

        opAnalyses.set(op, analysis);
        return analysis;
    }

    function analyzeOp(stackAnalysis: OperatorStackAnalysis, state: ValueGraphStateInfo): ExitState {

        const op = stackAnalysis.operator;


        // Call a function on the operator to get the access info
        const opInfo = op.type.getValueGraphAccess(op, stackAnalysis, state);

        if (opInfo !== null) {
            // This op accesses a value, create a node and update the state.

            let opAnalysis = getOpAnalysis(op);
            let accessNode: WriteableValueGraphAccessNode;

            // Get the info for the  variable
            const variableInfo = state.getVariableInfo(opInfo.variable);

            if (opAnalysis.node === null) {
                // Create a new access node according to the variable

                let value: CatnipCompilerValue;

                if (opInfo.type === ValueGraphAccessType.READ) {
                    value = variableInfo.value;
                } else {
                    value = opInfo.value;
                }

                accessNode = opAnalysis.node = {
                    op,
                    type: opInfo.type,
                    value: value,
                    prev: new Set(),
                    next: new Set()
                };
            } else {
                accessNode = opAnalysis.node;
                // Make sure the the existing node matches what we just got
                CatnipCompilerLogger.assert(accessNode.op === op);
                CatnipCompilerLogger.assert(accessNode.type === opInfo.type);
            }

            // Add the node to the graph
            for (const prevAccess of variableInfo.previousAccesses) {
                accessNode.prev.add(prevAccess);
                prevAccess.next.add(accessNode);
            }

            // Update the variable's state
            variableInfo.previousAccesses.clear();
            variableInfo.previousAccesses.add(accessNode);

            if (accessNode.type === ValueGraphAccessType.WRITE) {
                variableInfo.value = accessNode.value;
            }
        }

        // Next, we need to decend into any branches and update the state
        const branchNames = Object.keys(op.branches);

        let exitState: ExitState;

        if (branchNames.length === 0) {
            // No branches to analyse
            exitState = {
                continue: state,
                return: null
            };
        } else {
            // Branches

            exitState = {
                continue: null,
                return: null
            };

            for (const branchName of branchNames) {
                const branch = op.branches[branchName];

                if (branch.branchType !== CatnipIrBranchType.EXTERNAL || branch.body.func !== op.block.func) {
                    // This is a branch to inside of this function, we don't need to worry about arguments
                    CatnipCompilerLogger.assert(branch.parameters.length === 0);
                    exitStateOr(exitState, analyzeBasicBlock(branch.body, state.clone()));
                } else {
                    CatnipCompilerLogger.assert(branch.body.func.isEntrypoint);
                    CatnipCompilerLogger.assert(branch.body === branch.body.func.body);

                    // We will construct the ValueGraphStateInfo which is going to be used when analyzing the function
                    const callState = state.clone();

                    // Clear the parameters from this function
                    callState.parameters.length = 0;

                    // We are branching to an external function, we need to hook up the parameters
                    const branchParameters = branch.parameters;

                    if (branchParameters.length !== 0) {

                        // This is kinda ugly, but for right now we're assuming that the operator's operands
                        //  are what is being passed into its branches. This is true for now, but there's no
                        //  reason it has to be true in the future.

                        // TODO Come up with a better solution for getting the branch parameters
                        CatnipCompilerLogger.assert(branchParameters.length === stackAnalysis.operands.length);
                        const branchParamValues = stackAnalysis.operands;

                        const opAnalysis = getOpAnalysis(op);

                        if (opAnalysis.branch_args === null)
                            opAnalysis.branch_args = new Map();

                        let branchParamNodes = opAnalysis.branch_args.get(branch);


                        // We need to add a set node to every parameter of the function we're calling.
                        if (branchParamNodes === undefined) {
                            // We've never created nodes for this call
                            branchParamNodes = [];

                            for (let paramIdx = 0; paramIdx < branchParamValues.length; paramIdx++) {

                                const paramValue = branchParamValues[paramIdx];

                                const branchParamNode: WriteableValueGraphAccessNode = {
                                    op,
                                    type: ValueGraphAccessType.WRITE,
                                    value: paramValue.value,
                                    next: new Set(),
                                    prev: new Set(),
                                };

                                branchParamNodes.push(branchParamNode);

                                callState.parameters.push(new ValueGraphVariableInfo(
                                    paramValue.value, new Set([branchParamNode])
                                ));
                            }

                            opAnalysis.branch_args.set(branch, branchParamNodes);
                        } else {
                            // We already have nodes for this call, let's update them!

                            for (let paramIdx = 0; paramIdx < branchParamValues.length; paramIdx++) {

                                const paramValue = branchParamValues[paramIdx];
                                const branchParamNode = branchParamNodes[paramIdx];

                                branchParamNode.value = paramValue.value;

                                callState.parameters.push(new ValueGraphVariableInfo(
                                    paramValue.value, new Set([branchParamNode])
                                ));

                            }
                        }
                    }

                    // Get the exit state of the function we're calling
                    const funcExit = analyzeFunction(branch.body.func, callState, false);

                    // This function's exit state is what we continue with
                    exitStateOr(exitState, {
                        continue: new ValueGraphStateInfo(funcExit.variables, funcExit.transients, state.parameters), return: null
                    });
                }
            }
        }

        if (op.type.doesReturn(op)) {
            // If we return, our continue state should be or-ed into the return state
            exitStateOr(exitState, {
                continue: null,
                return: exitState.continue
            });
        }

        if (!op.type.doesContinue(op)) {
            exitState.continue = null;
        }

        return exitState;
    }

    // Takes in a basic block and a state for the project and analyses it and returns the exit state
    function analyzeBasicBlock(block: CatnipIrBasicBlock, entryState: ValueGraphStateInfo): ExitState {

        let blockAnalysis = blockAnalyses.get(block);
        let oldExit: ExitState | null;

        if (blockAnalysis === undefined) {
            blockAnalysis = {
                stack_analysis: analyzeBlockStack(block),
                entry: entryState.clone(),
                exit: null,
                assumed_exit: null,
            };
            blockAnalyses.set(block, blockAnalysis);
            oldExit = null;
        } else {

            if (!blockAnalysis.entry.or(entryState)) {
                // The entry state is already matching what we've been called to analyze

                if (blockAnalysis.exit !== null) {
                    // We have already analyzed this basic block
                    return blockAnalysis.exit;
                }

                // We are already currently analyzing this, so it's a loop or it's recursion.

                if (blockAnalysis.assumed_exit === null) {
                    // This is an initial guess and is almost certainly wrong.
                    //  We could probably make a much better guess by copying the state we have analyzed so far
                    //  but that's hard.
                    blockAnalysis.assumed_exit = {
                        continue: block.doesContinue() ? entryState.clone() : null,
                        return: entryState.clone()
                    };
                }

                return blockAnalysis.assumed_exit;
            }

            // Set exit to null to indicate we are currently analyzing this block
            oldExit = blockAnalysis.exit;
            blockAnalysis.exit = null;
        }

        while (true) {

            let exitState: ExitState = {
                continue: blockAnalysis.entry.clone(),
                return: null
            }

            let op = block.head;

            while (op !== null && exitState.continue !== null) {
                const newState = analyzeOp(blockAnalysis.stack_analysis.get(op)!, exitState.continue);

                exitState.continue = newState.continue;

                if (newState.return !== null) {
                    if (exitState.return === null) exitState.return = newState.return;
                    else exitState.return.or(newState.return);
                }

                op = op.next;
            }

            if (blockAnalysis.assumed_exit !== null) {
                // While analyzing, we analyzed the block again (recursion or a loop) and had to assume the state change
                //  If we didn't assume correctly, we need to start again with a better guess

                if (!exitStatesEqual(exitState, blockAnalysis.assumed_exit)) {
                    // We guessed wrong :c
                    // Set the assumed exit to our new guess and try again

                    // We don't clone because continueState and returnState are not used again
                    blockAnalysis.assumed_exit = exitState;

                    continue;
                }
            }

            // If exit was set during analysis, it means a more recent analysis has been done
            if (blockAnalysis.exit !== null) {
                return blockAnalysis.exit;
            }

            blockAnalysis.exit = exitState;

            return exitState;
        }
    }

    function analyzeFunction(func: CatnipIrFunction, state: ValueGraphStateInfo, force: boolean): ValueGraphStateInfo {

        const funcInfo = functions.get(func);
        CatnipCompilerLogger.assert(funcInfo !== undefined);

        const entryState = funcInfo.entry;

        const isUnique = entryState.or(state);

        if (!isUnique && !force) {
            // We've already analyzed this function with the combined state
            return funcInfo.exit;
        }

        const funcExitState = analyzeBasicBlock(func.body, entryState.clone());

        if (funcExitState.continue === null) {
            CatnipCompilerLogger.assert(funcExitState.return !== null, true, "Function must continue or return");
            funcInfo.exit = funcExitState.return;
        } else {
            if (funcExitState.return !== null)
                funcExitState.continue.or(funcExitState.return);

            funcInfo.exit = funcExitState.continue;
        }

        // If this function is yielding, we need to see if we've just modified the global state
        if (func.hasFunctionTableIndex) {
            for (const [variable, info] of funcInfo.exit.variables) {
                const globalVariable = variables.get(variable);
                CatnipCompilerLogger.assert(globalVariable !== undefined);

                if (globalVariable.or(info)) {

                    // We modified a global variable, we need to reanalyze every yielding function

                    for (const yieldFunction of yieldingFunctions) {
                        analyzeYieldingFunctions.add(yieldFunction);
                    }
                }
            }
        }

        return funcInfo.exit;
    }

    // We want to analyze every yielding function
    for (const yieldFunction of yieldingFunctions) {
        analyzeYieldingFunctions.add(yieldFunction);
    }

    // We analyze every yielding function over and over until the global state settles
    while (analyzeYieldingFunctions.size !== 0) {
        let func: CatnipIrFunction = null!;

        for (func of analyzeYieldingFunctions) {
            analyzeYieldingFunctions.delete(func);
            break;
        }

        const entryArguments: ValueGraphVariableInfo[] = [];

        for (const parameter of func.ir.parameters) {
            entryArguments.push(new ValueGraphVariableInfo(
                CatnipCompilerValue.none(), new Set()
            ));
        }

        analyzeFunction(func, new ValueGraphStateInfo(variables, new Map(), entryArguments), true);
    }

    const graphVariables: Map<CatnipVariable, ValueGraphValueInfo> = new Map();

    for (const [variable, info] of variables) {
        graphVariables.set(variable, {
            value: info.value,
            prev: info.previousAccesses
        });
    }

    const graphTransients: Map<CatnipIrTransientVariable, WritableValueGraphValueInfo> = new Map();

    for (const [func, funcInfo] of functions) {
        for (const [transient, transInfo] of funcInfo.exit.transients) {

            let graphInfo = graphTransients.get(transient);

            if (graphInfo === undefined) {
                graphInfo = {
                    value: CatnipCompilerValue.none(),
                    prev: new Set()
                };

                graphTransients.set(transient, graphInfo);
            }

            graphInfo.value = graphInfo.value.or(transInfo.value);
            
            for (const access of transInfo.previousAccesses)
                graphInfo.prev.add(access);
        }
    }

    const graphNodes: Map<CatnipIrOp, WriteableValueGraphAccessNode> = new Map();

    for (const [op, info] of opAnalyses) {
        if (info.node !== null)
            graphNodes.set(op, info.node);
    }

    const graphStackAnalysis: Map<CatnipIrOp, OperatorStackAnalysis> = new Map();

    for (const [block, info] of blockAnalyses) {
        for (const [op, analysis] of info.stack_analysis) {
            graphStackAnalysis.set(op, analysis);
        }
    }

    return new ValueGraph(graphNodes, graphVariables, graphTransients, graphStackAnalysis);
}

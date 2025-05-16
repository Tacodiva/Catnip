import { CatnipVariable } from "../../../runtime/CatnipVariable";
import { CatnipCompilerLogger } from "../../CatnipCompilerLogger";
import { CatnipCompilerStage } from "../../CatnipCompilerStage";
import { CatnipIrBasicBlock } from "../../CatnipIrBasicBlock";
import { CatnipIrFunction } from "../../CatnipIrFunction";
import { CatnipIrOp } from "../../CatnipIrOp";
import { CatnipIrTransientVariable } from "../../CatnipIrTransientVariable";
import { ir_transient_create } from "../../ir/core/transient_create";
import { ir_transient_load } from "../../ir/core/transient_load";
import { ir_transient_store } from "../../ir/core/transient_store";
import { ir_transient_tee } from "../../ir/core/transient_tee";
import { get_var_ir_inputs, ir_get_var } from "../../ir/data/get_var";
import { ir_set_var, set_var_ir_inputs } from "../../ir/data/set_var";
import { CatnipValueFormat } from "../../CatnipValueFormat";
import { CatnipCompilerPass } from "../CatnipCompilerPass";
import { CatnipIrBranchType } from "../../CatnipIrBranch";
import { CatnipIr } from "../../CatnipIr";
import { CatnipCompilerPassContext } from "../../CatnipCompilerPassContext";

enum VariableOperationType {
    GET,
    SET,
    SYNC
}

enum VariableOperationInlineStatus {
    DEFAULT,
    INLINE,
    BOTH
}

interface VariableOperation {
    variable: CatnipVariable;
    type: VariableOperationType.GET | VariableOperationType.SET;
    op: CatnipIrOp;
    status?: VariableOperationInlineStatus;
}

interface VariableSyncOperation {
    variable: CatnipVariable;
    type: VariableOperationType.SYNC;
    set: boolean;
}

interface VariableSync {
    op: CatnipIrOp | null;
}

class VariableCfgNode {
    public readonly index: number;
    public readonly branch: CatnipIrBasicBlock;
    public prev: VariableCfgNode[];
    public next: VariableCfgNode[];

    public variables: Map<CatnipVariable, (VariableOperation | VariableSyncOperation)[]>;
    public sync: VariableSync | null;

    public entryState: FunctionState | null;

    public constructor(index: number, branch: CatnipIrBasicBlock) {
        this.index = index;
        this.branch = branch;
        this.prev = [];
        this.next = [];
        this.variables = new Map();
        this.sync = null;
        this.entryState = null;
    }

    public pushNode(node: VariableCfgNode) {
        this.next.push(node);
        node.prev.push(this);
    }

    public pushOperation(op: VariableOperation | VariableSyncOperation) {
        let opList = this.variables.get(op.variable);

        if (opList === undefined) {
            opList = [];
            this.variables.set(op.variable, opList);
        }

        opList.push(op);
    }
}

function getVariableOperation(op: CatnipIrOp): VariableOperation | null {
    switch (op.type) {
        case ir_get_var:
            return { op, type: VariableOperationType.GET, variable: (op.inputs as get_var_ir_inputs).variable }
        case ir_set_var:
            return { op, type: VariableOperationType.SET, variable: (op.inputs as set_var_ir_inputs).variable }
        default:
            return null;
    }
}

interface VariableState {
    variable: CatnipVariable;
    isDefinitlySynced: boolean;
    isDefinitlyInitizlied: boolean;
    prevOperations: Set<VariableOperation | VariableSyncOperation>;
}

class FunctionState {
    variables: Map<CatnipVariable, VariableState>;

    constructor() {
        this.variables = new Map();
    }

    public getVariableState(variable: CatnipVariable): VariableState {
        let variableState = this.variables.get(variable);
        if (variableState === undefined) {
            variableState = {
                variable,
                isDefinitlySynced: true,
                isDefinitlyInitizlied: false,
                prevOperations: new Set(),
            };
            this.variables.set(variable, variableState);
        }
        return variableState;
    }

    public or(other: FunctionState): boolean {
        let modified = false;

        for (const [variable, otherVariableState] of other.variables) {
            const ourVariableState = this.variables.get(variable);

            if (ourVariableState === undefined) {
                this.variables.set(variable, {
                    variable,
                    isDefinitlySynced: false,
                    isDefinitlyInitizlied: false,
                    prevOperations: new Set(),
                });
                modified = true;
            } else {
                if (ourVariableState.isDefinitlySynced && !otherVariableState.isDefinitlySynced) {
                    ourVariableState.isDefinitlySynced = false;
                    modified = true;
                }

                if (ourVariableState.isDefinitlyInitizlied && !otherVariableState.isDefinitlyInitizlied) {
                    ourVariableState.isDefinitlyInitizlied = false;
                    modified = true;
                }
            }
        }

        for (const [variable, variableState] of this.variables) {
            if (other.variables.has(variable)) continue;

            if (variableState.isDefinitlyInitizlied) {
                variableState.isDefinitlyInitizlied = false;
                modified = true;
            }

            if (variableState.isDefinitlySynced) {
                variableState.isDefinitlySynced = false;
                modified = true;
            }
        }

        return modified;
    }

    public clone(): FunctionState {
        const clone = new FunctionState();

        for (const [variable, variableState] of this.variables) {
            clone.variables.set(variable, {
                ...variableState,
                prevOperations: new Set(variableState.prevOperations)
            });
        }

        return clone;
    }
}

export const PassVariableInlining: CatnipCompilerPass = {
    stage: CatnipCompilerStage.PASS_POST_ANALYSIS,

    run(ctx: CatnipCompilerPassContext): void {

        function optimizeFunction(func: CatnipIrFunction) {
            let currentBanchIndex = 0;
            
            const visitedBranches: Map<CatnipIrBasicBlock, VariableCfgNode> = new Map();

            function createBranchVariableCfg(branch: CatnipIrBasicBlock): { head: VariableCfgNode, tail: VariableCfgNode | null } {
                let headNode = visitedBranches.get(branch);


                if (headNode !== undefined)
                    return { head: headNode, tail: null };

                let node: VariableCfgNode | null = headNode = new VariableCfgNode(currentBanchIndex++, branch);
                visitedBranches.set(branch, node);
                let op = branch.head;

                // console.debug(`Starting node ${headNode.index}`);

                while (op !== null) {
                    const variableOperation = getVariableOperation(op);

                    if (variableOperation !== null) {
                        // console.debug(`Adding variable operation to ${node.index}.`);
                        node.pushOperation(variableOperation);
                    }

                    const branchNames = Object.keys(op.branches);
                    let doesSync = false;

                    if (op.type.isBarrier(op)) {
                        doesSync = true;
                    } else {
                        for (const branchName of branchNames) {
                            const subbranch = op.branches[branchName];
                            if (subbranch.branchType === CatnipIrBranchType.EXTERNAL || subbranch.body.func !== func) {
                                doesSync = true;
                                break;
                            }
                        }
                    }

                    if (doesSync) {
                        node.sync = { op };

                        const newNode = new VariableCfgNode(currentBanchIndex++, branch);
                        node.pushNode(newNode);
                        // console.debug(`Adding sync node ${newNode.index} after ${node.index}.`);
                        node = newNode;
                    }

                    const doesContinue = op.type.doesContinue(op);

                    if (branchNames.length !== 0) {

                        const branchNodes: VariableCfgNode[] = [];

                        for (let i = 0; i < branchNames.length; i++) {
                            const branchName = branchNames[i];
                            const subbranch = op.branches[branchName];

                            if (subbranch.branchType === CatnipIrBranchType.INTERNAL && subbranch.body.func === func) {
                                // console.debug("Descending into branch.");
                                const branchNode = createBranchVariableCfg(subbranch.body);
                                node.pushNode(branchNode.head);

                                if (branchNode.tail !== null) {
                                    branchNodes.push(branchNode.tail);
                                }
                            }
                        }

                        if (doesContinue && branchNodes.length !== 0) {
                            node = new VariableCfgNode(currentBanchIndex++, branch);
                            for (const branchNode of branchNodes) {
                                branchNode.pushNode(node);
                                // console.debug(`Adding after node ${node.index} to node ${branchNode.index}.`);
                            }
                        }
                    }

                    if (!doesContinue) {
                        // console.debug("End B " + headNode.index);
                        return { head: headNode, tail: null };
                    }

                    op = op.next;
                }

                // console.debug(`End A ${headNode.index} (tail ${node.index})`);

                return { head: headNode, tail: node };
            }

            const bodyNodes = createBranchVariableCfg(func.body);
            if (bodyNodes.tail !== null)
                bodyNodes.tail.sync = { op: null };

            /**
             * TODO We want a way of moving any initial gets outside of any loops. This can
             *  be done by moving all guarenteed "gets" to the top of the function / after the sync
             *  points. This can only happen if all the possible next operations are gets.
             */

            const variableTransients: Map<CatnipVariable, CatnipIrTransientVariable> = new Map();

            function getTransient(variable: CatnipVariable): CatnipIrTransientVariable {
                let transient = variableTransients.get(variable);
                if (transient === undefined) {
                    transient = new CatnipIrTransientVariable(func.ir, CatnipValueFormat.F64, variable.name + "_inline");
                    func.body.insertOpFirst(
                        ir_transient_create, { transient }, {}
                    );
                    variableTransients.set(variable, transient);
                }
                return transient;
            }

            const variableOptimizationCount: Map<CatnipVariable, number> = new Map();
            const visitedNodes: Set<VariableCfgNode> = new Set();

            function setOperationStatus(operation: VariableOperation, status: VariableOperationInlineStatus) {
                if (operation.status === status) return;

                if (operation.status === VariableOperationInlineStatus.INLINE) {
                    variableOptimizationCount.set(operation.variable,
                        (variableOptimizationCount.get(operation.variable) ?? 0) - 1
                    );
                } else if (status === VariableOperationInlineStatus.INLINE) {
                    variableOptimizationCount.set(operation.variable,
                        (variableOptimizationCount.get(operation.variable) ?? 0) + 1
                    );
                }

                operation.status = status;
            }

            function findOptimizations(node: VariableCfgNode, state: FunctionState) {
                let modified = false;

                if (node.entryState !== null) {
                    modified ||= node.entryState.or(state);
                    state = node.entryState.clone();
                } else {
                    node.entryState = state.clone();
                }

                for (const [variable, operations] of node.variables) {
                    const variableState = state.getVariableState(variable);

                    for (const operation of operations) {

                        if (operation.type === VariableOperationType.SYNC) {

                            variableState.isDefinitlySynced = true;
                            variableState.isDefinitlyInitizlied = operation.set;

                        } else {

                            let status = operation.status;
                            if (status === VariableOperationInlineStatus.DEFAULT) {

                                if (operation.type === VariableOperationType.SET) {
                                    variableState.isDefinitlySynced = true;
                                }

                            } else {

                                if (operation.type === VariableOperationType.GET) {
                                    if (!variableState.isDefinitlyInitizlied) {
                                        if (variableState.prevOperations.size !== 0) {
                                            /*
                                            
                                            This is a case like
                                             
                                            if () {
                                               set (var) to (10)
                                            }
                                            print (var)
    
                                            In this case, we must ensure all the possible previous
                                            operations write to the actual variable
                                             */
                                            for (const prevOperation of variableState.prevOperations) {
                                                if (prevOperation.type === VariableOperationType.SET && prevOperation.status === VariableOperationInlineStatus.INLINE) {
                                                    setOperationStatus(prevOperation, VariableOperationInlineStatus.BOTH);
                                                    modified = true;
                                                } else if (prevOperation.type === VariableOperationType.SYNC) {
                                                    modified ||= !prevOperation.set;
                                                    prevOperation.set = true;
                                                }
                                            }
                                        }

                                        status = VariableOperationInlineStatus.BOTH;
                                    } else {
                                        if (status !== VariableOperationInlineStatus.BOTH)
                                            status = VariableOperationInlineStatus.INLINE;
                                    }
                                } else {
                                    if (status === VariableOperationInlineStatus.BOTH) {
                                        variableState.isDefinitlySynced = true;
                                    } else {
                                        status = VariableOperationInlineStatus.INLINE;
                                        variableState.isDefinitlySynced = false;
                                    }
                                }

                                if (status !== operation.status) {
                                    setOperationStatus(operation, status);
                                    modified = true;
                                }

                                variableState.isDefinitlyInitizlied = true;
                            }

                        }
                        variableState.prevOperations.clear();
                        variableState.prevOperations.add(operation);
                    }
                }

                if (node.sync !== null) {

                    for (const [variable, variableState] of state.variables) {
                        if (variableState.prevOperations.size !== 1 || variableState.prevOperations.values().next().value!.type !== VariableOperationType.SYNC) {
                            modified = true;

                            const syncOp: VariableSyncOperation = {
                                variable,
                                type: VariableOperationType.SYNC,
                                set: false,
                            };
                            
                            variableState.isDefinitlySynced = true;
                            variableState.isDefinitlyInitizlied = syncOp.set;

                            variableState.prevOperations.clear();
                            variableState.prevOperations.add(syncOp);

                            node.pushOperation(syncOp);
                        }
                    }
                }

                if (!visitedNodes.has(node) || modified) {
                    visitedNodes.add(node);
                    for (const subnode of node.next) {
                        // TODO This might stack overflow in long scripts :c
                        //   We should wrap this whole function in a loop and process
                        //   a subnode without another call.
                        findOptimizations(subnode, state.clone());
                    }
                }
            }

            findOptimizations(bodyNodes.head, new FunctionState());

            function optimizeNode(node: VariableCfgNode) {
                if (visitedNodes.has(node)) return;
                visitedNodes.add(node);

                for (const [variable, operations] of node.variables) {

                    if (!ctx.compiler.config.enable_optimization_variable_inlining_force &&
                        (variableOptimizationCount.get(variable) ?? 0) <= 1)
                        continue;

                    for (const operation of operations) {
                        if (operation.type === VariableOperationType.GET) {
                            switch (operation.status) {
                                case VariableOperationInlineStatus.BOTH:
                                    operation.op.block.insertOpAfter(
                                        operation.op,
                                        ir_transient_tee,
                                        { transient: getTransient(variable) },
                                        {}
                                    );
                                    break;
                                case VariableOperationInlineStatus.INLINE:
                                    operation.op.block.replaceOp(
                                        operation.op,
                                        ir_transient_load,
                                        { transient: getTransient(variable) },
                                        {}
                                    );
                                    break;
                            }
                        } else if (operation.type === VariableOperationType.SET) {
                            switch (operation.status) {
                                case VariableOperationInlineStatus.BOTH:
                                    operation.op.block.insertOpBefore(
                                        ir_transient_tee,
                                        { transient: getTransient(variable) },
                                        {},
                                        operation.op
                                    );
                                    break;
                                case VariableOperationInlineStatus.INLINE:
                                    operation.op.block.replaceOp(
                                        operation.op,
                                        ir_transient_store,
                                        { transient: getTransient(variable) },
                                        {}
                                    );
                                    break;
                            }
                        } else {
                            CatnipCompilerLogger.assert(operation.type === VariableOperationType.SYNC);
                            CatnipCompilerLogger.assert(node.sync !== null);

                            let syncGetOp: CatnipIrOp;

                            if (node.sync.op === null) {
                                syncGetOp = node.branch.insertOpLast(
                                    ir_transient_load,
                                    { transient: getTransient(variable) },
                                    {}
                                );
                            } else {
                                syncGetOp = node.branch.insertOpBefore(
                                    ir_transient_load,
                                    { transient: getTransient(variable) },
                                    {},
                                    node.sync.op,
                                );
                            }

                            syncGetOp.block.insertOpAfter(
                                syncGetOp,
                                ir_set_var,
                                { target: variable.sprite.defaultTarget, variable: variable, format: CatnipValueFormat.F64 },
                                {}
                            );

                            if (operation.set) {
                                CatnipCompilerLogger.assert(node.sync.op !== null);

                                const syncSetOp = node.branch.insertOpAfter(
                                    node.sync.op,
                                    ir_get_var,
                                    { target: variable.sprite.defaultTarget, variable: variable }, {}
                                );

                                syncSetOp.block.insertOpAfter(
                                    syncSetOp,
                                    ir_transient_store,
                                    { transient: getTransient(variable) }, {}
                                );
                            }
                        }
                    }
                }

                for (const subnode of node.next) {
                    optimizeNode(subnode);
                }
            }

            visitedNodes.clear();
            optimizeNode(bodyNodes.head);
        }

        ctx.forEachFunction(optimizeFunction);
    }
}
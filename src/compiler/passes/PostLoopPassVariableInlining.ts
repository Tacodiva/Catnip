import { CatnipVariable } from "../../runtime/CatnipVariable";
import { CatnipCompilerLogger } from "../CatnipCompilerLogger";
import { CatnipCompilerStage } from "../CatnipCompilerStage";
import { CatnipReadonlyIr } from "../CatnipIr";
import { CatnipReadonlyIrBranch } from "../CatnipIrBranch";
import { CatnipReadonlyIrFunction } from "../CatnipIrFunction";
import { CatnipReadonlyIrOp } from "../CatnipIrOp";
import { CatnipIrTransientVariable } from "../CatnipIrTransientVariable";
import { ir_barrier } from "../ir/core/barrier";
import { ir_transient_create } from "../ir/core/transient_create";
import { ir_transient_load } from "../ir/core/transient_load";
import { ir_transient_store } from "../ir/core/transient_store";
import { ir_transient_tee } from "../ir/core/transient_tee";
import { get_var_ir_inputs, ir_get_var } from "../ir/data/get_var";
import { ir_set_var, set_var_ir_inputs } from "../ir/data/set_var";
import { CatnipValueFormat } from "../types";
import { CatnipCompilerPass } from "./CatnipCompilerPass";

enum VariableOperationType {
    GET,
    SET
}

enum VariableOperationInlineStatus {
    DEFAULT,
    INLINE,
    BOTH
}

interface VariableOperation {
    variable: CatnipVariable;
    type: VariableOperationType.GET | VariableOperationType.SET;
    op: CatnipReadonlyIrOp;
    status?: VariableOperationInlineStatus;
}

interface VariableSync {
    op: CatnipReadonlyIrOp | null;
}

class VariableCfgNode {

    public readonly branch: CatnipReadonlyIrBranch;
    public prev: VariableCfgNode[];
    public next: VariableCfgNode[];

    public variables: Map<CatnipVariable, VariableOperation[]>;
    public sync: VariableSync | null;

    public constructor(branch: CatnipReadonlyIrBranch) {
        this.branch = branch;
        this.prev = [];
        this.next = [];
        this.variables = new Map();
        this.sync = null;
    }

    public pushBranch(branch: CatnipReadonlyIrBranch): VariableCfgNode {
        const newNode = new VariableCfgNode(branch);
        this.pushNode(newNode);
        return newNode;
    }

    public pushNode(node: VariableCfgNode) {
        this.next.push(node);
        node.prev.push(this);
    }

    public pushOperation(op: VariableOperation) {
        let opList = this.variables.get(op.variable);

        if (opList === undefined) {
            opList = [];
            this.variables.set(op.variable, opList);
        }

        opList.push(op);
    }
}

function getVariableOperation(op: CatnipReadonlyIrOp): VariableOperation | null {
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
    isDefinitlySynced: boolean;
    isDefinitlyInitizlied: boolean;
    prevOperations: (VariableOperation | VariableSync)[];
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
                isDefinitlySynced: true,
                isDefinitlyInitizlied: false,
                prevOperations: []
            };
            this.variables.set(variable, variableState);
        }
        return variableState;
    }

    public or(other: FunctionState) {
        for (const [variable, otherVariableState] of other.variables) {
            const ourVariableState = this.variables.get(variable);

            if (ourVariableState === undefined) {
                this.variables.set(variable, {
                    isDefinitlySynced: false,
                    isDefinitlyInitizlied: false,
                    prevOperations: []
                });
            } else {
                ourVariableState.isDefinitlySynced &&= otherVariableState.isDefinitlySynced;
                ourVariableState.isDefinitlyInitizlied &&= otherVariableState.isDefinitlyInitizlied;
                ourVariableState.prevOperations.push(...otherVariableState.prevOperations);
            }
        }
    }

    public clone(): FunctionState {
        const clone = new FunctionState();

        for (const [variable, variableState] of this.variables) {
            clone.variables.set(variable, {
                ...variableState,
                prevOperations: [...variableState.prevOperations]
            });
        }

        return clone;
    }
}

export const LoopPassVariableInlining: CatnipCompilerPass = {
    stage: CatnipCompilerStage.PASS_POST_ANALYSIS_LOOP,

    run(ir: CatnipReadonlyIr): void {

        function optimizeFunction(func: CatnipReadonlyIrFunction) {

            const visitedBranches: Map<CatnipReadonlyIrBranch, VariableCfgNode> = new Map();

            function createBranchVariableCfg(branch: CatnipReadonlyIrBranch): { head: VariableCfgNode, tail: VariableCfgNode | null } {
                let headNode = visitedBranches.get(branch);

                if (headNode !== undefined)
                    return { head: headNode, tail: null };

                let node: VariableCfgNode | null = headNode = new VariableCfgNode(branch);
                visitedBranches.set(branch, node);
                let op = branch.head;

                while (op !== null) {
                    const variableOperation = getVariableOperation(op);

                    if (variableOperation !== null) {
                        node.pushOperation(variableOperation);
                    }

                    const branchNames = Object.keys(op.branches);
                    let doesSync = false;

                    if (op.type === ir_barrier) {
                        doesSync = true;
                    } else {
                        for (const branchName of branchNames) {
                            const subbranch = op.branches[branchName];
                            if (subbranch !== null && subbranch.func !== branch.func) {
                                doesSync = true;
                                break;
                            }
                        }
                    }

                    if (doesSync) {
                        node.sync = { op };
                        node = node.pushBranch(branch);
                    }

                    const doesContinue = op.type.doesContinue(op);

                    if (branchNames.length !== 0) {

                        const branchNodes: VariableCfgNode[] = [];

                        for (let i = 0; i < branchNames.length; i++) {
                            const branchName = branchNames[i];
                            const subbranch = op.branches[branchName];

                            if (subbranch !== null && subbranch.func === func) {
                                const branchNode = createBranchVariableCfg(subbranch);
                                node.pushNode(branchNode.head);

                                if (branchNode.tail !== null) {
                                    branchNodes.push(branchNode.tail);
                                }
                            }
                        }

                        if (doesContinue) {
                            node = new VariableCfgNode(branch);

                            for (const branchNode of branchNodes)
                                branchNode.pushNode(node);
                        }
                    }

                    if (!doesContinue) {
                        return { head: headNode, tail: null };
                    }

                    op = op.next;
                }

                return { head: headNode, tail: node };
            }

            const bodyNodes = createBranchVariableCfg(func.body);
            if (bodyNodes.tail !== null)
                bodyNodes.tail.sync = { op: null };

            /**
             * TODO We want a way of moving any initial gets or sets outside of any loops. This can
             *  be done by moving all guarenteed "gets" to the top of the function / after the sync
             *  points. This can only happen if all the possible next operations are gets.
             */

            const variableTransients: Map<CatnipVariable, CatnipIrTransientVariable> = new Map();

            function getTransient(variable: CatnipVariable): CatnipIrTransientVariable {
                let transient = variableTransients.get(variable);
                if (transient === undefined) {
                    transient = new CatnipIrTransientVariable(CatnipValueFormat.VALUE_BOXED, variable.name + "_inline");
                    func.body.insertOpFirst(
                        ir_transient_create, { transient }, {}
                    );
                    variableTransients.set(variable, transient);
                }
                return transient;
            }

            const visitedNodes: Set<VariableCfgNode> = new Set();

            function findOptimizations(node: VariableCfgNode, state: FunctionState) {

                let updated = false;

                for (const [variable, operations] of node.variables) {
                    const variableState = state.getVariableState(variable);

                    for (const operation of operations) {

                        let status = operation.status;
                        if (status === VariableOperationInlineStatus.DEFAULT) {

                            if (operation.type === VariableOperationType.SET) {
                                variableState.isDefinitlySynced = true;
                            }

                        } else {

                            if (operation.type === VariableOperationType.GET) {
                                if (!variableState.isDefinitlyInitizlied) {
                                    status = VariableOperationInlineStatus.BOTH;
                                } else {
                                    // console.log("B");
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

                            if (status !== operation.status)
                                updated = true;
                            operation.status = status;

                            variableState.isDefinitlyInitizlied = true;
                        }

                        variableState.prevOperations.length = 1;
                        variableState.prevOperations[0] = operation;
                    }
                }

                if (node.sync !== null) {

                    for (const [variable, variableState] of state.variables) {
                        if (!variableState.isDefinitlySynced || !variableState.isDefinitlyInitizlied) {

                            let syncGetOp: CatnipReadonlyIrOp;

                            if (node.sync.op === null) {
                                syncGetOp = node.branch.insertOpLast(
                                    ir_get_var,
                                    { target: variable.sprite.defaultTarget, variable: variable },
                                    {}
                                );
                            } else {
                                syncGetOp = node.branch.insertOpBefore(
                                    ir_get_var,
                                    { target: variable.sprite.defaultTarget, variable: variable },
                                    {},
                                    node.sync.op,
                                );
                            }

                            const getOperation: VariableOperation = {
                                type: VariableOperationType.GET,
                                op: syncGetOp,
                                variable,
                                status: VariableOperationInlineStatus.INLINE
                            };

                            node.pushOperation(getOperation);

                            const syncSetOp = syncGetOp.branch.insertOpAfter(
                                syncGetOp,
                                ir_set_var,
                                { target: variable.sprite.defaultTarget, variable: variable, format: CatnipValueFormat.f64 },
                                {}
                            );

                            const setOperation: VariableOperation = {
                                type: VariableOperationType.SET,
                                op: syncSetOp,
                                variable,
                                status: VariableOperationInlineStatus.DEFAULT
                            };

                            node.pushOperation(setOperation);

                            variableState.isDefinitlySynced = true;
                            variableState.prevOperations.length = 0;
                            variableState.prevOperations[0] = setOperation;
                        }
                    }
                }

                if (!visitedNodes.has(node) || updated) {
                    visitedNodes.add(node);
                    for (const subnode of node.next) {
                        findOptimizations(subnode, state.clone());
                    }
                }
            }

            findOptimizations(bodyNodes.head, new FunctionState());

            function optimizeNode(node: VariableCfgNode) {
                if (visitedNodes.has(node)) return;
                visitedNodes.add(node);

                for (const [variable, operations] of node.variables) {
                    for (const operation of operations) {
                        if (operation.type === VariableOperationType.GET) {
                            switch (operation.status) {
                                case VariableOperationInlineStatus.BOTH:
                                    operation.op.branch.insertOpAfter(
                                        operation.op,
                                        ir_transient_tee,
                                        { transient: getTransient(variable) },
                                        {}
                                    );
                                    break;
                                case VariableOperationInlineStatus.INLINE:
                                    operation.op.branch.replaceOp(
                                        operation.op,
                                        ir_transient_load,
                                        { transient: getTransient(variable) },
                                        {}
                                    );
                                    break;
                            }
                        } else {
                            CatnipCompilerLogger.assert(operation.type === VariableOperationType.SET);
                            switch (operation.status) {
                                case VariableOperationInlineStatus.BOTH:
                                    operation.op.branch.insertOpBefore(
                                        ir_transient_tee,
                                        { transient: getTransient(variable) },
                                        {},
                                        operation.op
                                    );
                                    break;
                                case VariableOperationInlineStatus.INLINE:
                                    operation.op.branch.replaceOp(
                                        operation.op,
                                        ir_transient_store,
                                        { transient: getTransient(variable) },
                                        {}
                                    );
                                    break;
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

        ir.functions.forEach(optimizeFunction);
    }
}
import { CatnipVariable } from "../../runtime/CatnipVariable";
import { CatnipCompilerStage } from "../CatnipCompilerStage";
import { CatnipReadonlyIr } from "../CatnipIr";
import { CatnipReadonlyIrBranch } from "../CatnipIrBranch";
import { CatnipReadonlyIrFunction } from "../CatnipIrFunction";
import { CatnipReadonlyIrOp } from "../CatnipIrOp";
import { CatnipIrTransientVariable } from "../CatnipIrTransientVariable";
import { ir_transient_create } from "../ir/core/transient_create";
import { ir_transient_store } from "../ir/core/transient_store";
import { ir_transient_tee } from "../ir/core/transient_tee";
import { get_var_ir_inputs, ir_get_var } from "../ir/data/get_var";
import { ir_set_var, set_var_ir_inputs } from "../ir/data/set_var";
import { CatnipValueFormat } from "../types";
import { CatnipCompilerPass } from "./CatnipCompilerPass";

export const LoopPassVariableInlining: CatnipCompilerPass = {
    stage: CatnipCompilerStage.PASS_POST_ANALYSIS_LOOP,

    run(ir: CatnipReadonlyIr): void {

        function optimizeFunction(func: CatnipReadonlyIrFunction) {

            enum VariableOpType {
                GET,
                SET,
                SYNC
            }

            type VariableOpSync = {
                type: VariableOpType.SYNC
                op: CatnipReadonlyIrOp,
                nextOps: VariableOpSpace | null
            };

            type VariableOp = {
                type: VariableOpType.GET | VariableOpType.SET,
                op: CatnipReadonlyIrOp,
                nextOps: VariableOpSpace | null
                variable: CatnipVariable
            } | VariableOpSync;

            /** Represents the possible different operations we can perform on a variable (the possibility space). */
            interface VariableOpSpace {
                /** True if we may perform no operation, false is we always perform an operation. */
                maybeNone: boolean,
                /** A list of the possible operations we may perform. */
                ops: VariableOp[],
            }

            type VariableOpSpaces = Map<CatnipVariable, VariableOpSpace>;

            /** Represents how an operation (could be a branch or a single op) accesses variables */
            type OpSpace = {
                /** A map between a variable and how we access that variable for the first time. */
                first: VariableOpSpaces,
                /** A map between a variable and how we access that variable for the last time. */
                last: VariableOpSpaces,
                /** A list of the "sync" operations we may hit. */
                syncs: VariableOpSync[],
                /** True if we are guaranteed to hit one of the syncs in `syncs`, otherwise false. */
                syncGuaranteed: boolean,
            };

            const analyzedBranches: Set<CatnipReadonlyIrBranch> = new Set();

            function getVariableOp(op: CatnipReadonlyIrOp): { type: VariableOpType, variable: CatnipVariable } | null {
                switch (op.type) {
                    case ir_get_var:
                        return { type: VariableOpType.GET, variable: (op.inputs as get_var_ir_inputs).variable }
                    case ir_set_var:
                        return { type: VariableOpType.SET, variable: (op.inputs as set_var_ir_inputs).variable }
                    default:
                        return null;
                }
            }

            /** Creates a `BranchVariableOps` which represents the  */
            function analyzeOp(op: CatnipReadonlyIrOp): OpSpace {
                const firstOps: VariableOpSpaces = new Map();
                const lastOps: VariableOpSpaces = new Map();
                const syncs: VariableOpSync[] = [];
                let syncGuaranteed: boolean = true;

                // Analyze the op's branches
                let firstBranch = true;
                const branchNames = Object.keys(op.branches);
                for (const branchName of branchNames) {
                    const branch = op.branches[branchName];

                    if (branch === null) {
                        // If the branch has no ops, every variable may have nothing done to it.
                        //  Thus, we need to set `maybeNone` to true.

                        for (const variableOp of lastOps.values())
                            variableOp.maybeNone = true;

                        for (const variableOp of firstOps.values())
                            variableOp.maybeNone = true;

                        syncGuaranteed = false;
                    } else if (branch.func !== func) {
                        // If we branch to another function, we need to sync all of the variable's values.
                        //   Create a sync point and add it to every variable.
                        const sync: VariableOpSync = { op, type: VariableOpType.SYNC, nextOps: null };
                        syncs.push(sync);

                        for (const variableOp of lastOps.values()) variableOp.ops.push(sync);
                        for (const variableOp of firstOps.values()) variableOp.ops.push(sync);
                    } else {
                        // Otherwise, we need to add the branch's op space to this op space.

                        // We may already have the results for this branch
                        if (!analyzedBranches.has(branch)) {
                            const branchOps = analyzeBranch(branch);

                            // The sync points need to be added to this op space as possibilities
                            syncs.push(...branchOps.syncs);
                            // The sync can only stay guaranteed if this branch's syncs are guaranteed
                            if (branchOps.syncGuaranteed)
                                syncGuaranteed = branchOps.syncGuaranteed;

                            function processOps(src: VariableOpSpaces, dst: VariableOpSpaces) {
                                for (const [variable, variableOp] of dst) {
                                    if (!src.has(variable))
                                        variableOp.maybeNone = true;
                                }

                                for (const [variable, srcOp] of src) {
                                    let dstOp = dst.get(variable);

                                    if (dstOp === undefined) {
                                        dst.set(variable, {
                                            maybeNone: (srcOp.maybeNone || !firstBranch) && !syncGuaranteed,
                                            ops: [...srcOp.ops]
                                        });
                                    } else {
                                        dstOp.maybeNone ||= srcOp.maybeNone;
                                        dstOp.ops.push(...srcOp.ops);
                                    }
                                }
                            }

                            processOps(branchOps.first, firstOps);
                            processOps(branchOps.last, lastOps);
                        }
                    }

                    firstBranch = false;
                }

                // Analyze the op's actual operation
                const opInfo = getVariableOp(op);

                if (opInfo !== null) {
                    const variable = opInfo.variable;

                    const opVarOp: VariableOp = {
                        op,
                        type: opInfo.type,
                        variable: opInfo.variable,
                        nextOps: null
                    };

                    // First
                    const oldFirst = firstOps.get(variable);
                    if (oldFirst === undefined) {
                        firstOps.set(variable, { maybeNone: false, ops: [...syncs, opVarOp] });
                    } else {
                        if (oldFirst.maybeNone) {
                            oldFirst.maybeNone = false;
                            oldFirst.ops.push(opVarOp);
                        }
                    }

                    // Last
                    lastOps.set(variable, { maybeNone: false, ops: [...syncs, opVarOp] });
                }

                if (syncs.length === 0) syncGuaranteed = false;

                return { first: firstOps, last: lastOps, syncs, syncGuaranteed };
            }
            
            function analyzeBranch(branch: CatnipReadonlyIrBranch): OpSpace {
                const branchOps: OpSpace = {
                    first: new Map(),
                    last: new Map(),
                    syncs: [],
                    syncGuaranteed: false,
                };

                // TODO This could break if we set a variable in a loop after the jump to the head of the loop
                analyzedBranches.add(branch);

                let op = branch.head;

                while (op !== null) {

                    const opOps = analyzeOp(op);

                    for (const [variable, newFirstOp] of opOps.first) {
                        if (!branchOps.first.has(variable)) {
                            branchOps.first.set(variable, newFirstOp);
                        }
                    }

                    for (const [variable, newLastOp] of opOps.last) {
                        const oldLastOp = branchOps.first.get(variable);

                        if (oldLastOp !== undefined) {
                            for (const op of oldLastOp.ops) {
                                op.nextOps = newLastOp;
                            }
                        }

                        branchOps.last.set(variable, newLastOp);
                    }

                    if (!branchOps.syncGuaranteed) {
                        branchOps.syncs.push(...opOps.syncs);
                        branchOps.syncGuaranteed ||= opOps.syncGuaranteed;
                    }

                    op = op.next;
                }

                return branchOps;
            }

            const funcOps = analyzeBranch(func.body);


            // TODO set all the variables before we call a function and load them all afterwards.

            function printBranchOps(funcIps: OpSpace) {
                function printOps(ops: VariableOpSpaces) {
                    for (const [variable, variableOp] of ops) {
                        let str = `  ${variable.name}: ${(variableOp.maybeNone ? "NONE " : "")}`;

                        for (const singleOp of variableOp.ops) {
                            switch (singleOp.type) {
                                case VariableOpType.GET:
                                    str += "GET";
                                    break;
                                case VariableOpType.SET:
                                    str += "SET";
                                    break;
                                case VariableOpType.SYNC:
                                    str += "SYNC";
                                    break;
                            }
                            if (singleOp.nextOps !== null)
                                str += "*";
                            str += " ";
                        }

                        console.log(str);
                    }
                }

                console.log(`${func.name}: ${(funcOps.syncGuaranteed ? "SYNC " : (funcOps.syncs.length === 0 ? "NO-SYNC " : "MAYBE-SYNC"))}`);
                console.log(" last: ");
                printOps(funcOps.last);
                console.log(" first: ");
                printOps(funcOps.first);
            }

            printBranchOps(funcOps);

            // These are variable operations which we need, so they can't be replaced later.
            const protectedOps: Set<CatnipReadonlyIrOp> = new Set();

            // All the variables we are optimizing and their associated transient
            const inlinedVariables: Map<CatnipVariable, CatnipIrTransientVariable> = new Map();

            for (const [variable, firstOps] of funcOps.first) {

                const isOptimizable = firstOps.ops.findIndex(op => op.nextOps !== null) !== -1;

                if (!isOptimizable) continue;

                const transient = new CatnipIrTransientVariable(CatnipValueFormat.VALUE_BOXED, variable.name + "_inline");
                inlinedVariables.set(variable, transient);

                for (const firstOp of firstOps.ops) {

                    if (firstOp.type === VariableOpType.GET) {
                        protectedOps.add(firstOp.op);

                        firstOp.op.branch.insertOpAfter(firstOp.op, ir_transient_tee, { transient }, {});
                    } else {
                        firstOp.op.branch.replaceOp(firstOp.op, ir_transient_store, { transient }, {})
                    }
                }


                if (transient !== null) {
                    func.body.insertOpFirst(ir_transient_create, { transient }, {});
                }
            }
        }

        ir.functions.forEach(optimizeFunction);
    }
}
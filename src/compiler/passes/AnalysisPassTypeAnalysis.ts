
import { CatnipCompilerLogger } from "../CatnipCompilerLogger";
import { CatnipCompilerStack } from "../CatnipCompilerStack";
import { CatnipCompilerStage } from "../CatnipCompilerStage";
import { CatnipCompilerState } from "../CatnipCompilerState";
import { CatnipReadonlyIr } from "../CatnipIr";
import { CatnipIrBasicBlock } from "../CatnipIrBasicBlock";
import { CatnipIrBranchType } from "../CatnipIrBranch";
import { CatnipIrFunction } from "../CatnipIrFunction";
import { CatnipIrInputOp } from "../CatnipIrOp";
import { CatnipCompilerPass } from "./CatnipCompilerPass";

interface StateInfo {
    stack: CatnipCompilerStack;
    state: CatnipCompilerState;
}

interface BlockInfo {
    isAnalyzing: boolean;
    modifiedDuringAnalysis: boolean;
    doesContinue: boolean;

    entry: StateInfo;
    exit: StateInfo | null;
}

export function doTypeAnalysis(func: CatnipIrFunction) {

    const blockInfos: Map<CatnipIrBasicBlock, BlockInfo> = new Map();

    function analyzeBasicBlock(block: CatnipIrBasicBlock) {
        const blockInfo = blockInfos.get(block);
        CatnipCompilerLogger.assert(blockInfo !== undefined);

        if (blockInfo.isAnalyzing)
            throw new Error("Already analyzing block.");

        blockInfo.isAnalyzing = true;

        let stack: CatnipCompilerStack;
        let state: CatnipCompilerState;

        do {
            blockInfo.modifiedDuringAnalysis = false;

            stack = blockInfo.entry.stack.clone();
            state = blockInfo.entry.state.clone();

            let op = block.head;

            while (op !== null) {
                const operandConut = op.type.getOperandCount(op.inputs, op.branches);
                const operands = stack.pop(operandConut);

                for (let i = 0; i < operandConut; i++) {
                    op.operands[i] = operands[i];
                }

                const opContinues = op.type.doesContinue(op);

                const branchNames = Object.keys(op.branches);
                if (branchNames.length !== 0) {

                    let branchesExitState: StateInfo | null = null;

                    for (const branchName of branchNames) {
                        const branch = op.branches[branchName];

                        if (branch.branchType === CatnipIrBranchType.EXTERNAL || branch.body.func !== func) {
                            // Clear the state, we don't know who we're calling.
                            continue;
                        }

                        let branchBlockInfo = blockInfos.get(branch.body);

                        if (branchBlockInfo === undefined) {
                            branchBlockInfo = {
                                isAnalyzing: false,
                                modifiedDuringAnalysis: false,

                                entry: {
                                    stack: stack.clone(),
                                    state: state.clone()
                                },

                                exit: null,
                                doesContinue: true,
                            };
                            blockInfos.set(branch.body, branchBlockInfo);

                            analyzeBasicBlock(branch.body);
                        } else {

                            let modified = false;

                            if (!(stack.isSubsetOf(branchBlockInfo.entry.stack) && state.isSubsetOf(branchBlockInfo.entry.state))) {
                                // We need to re-analyze the branch with the new info.
                                branchBlockInfo.entry.stack = stack.or(branchBlockInfo.entry.stack);
                                branchBlockInfo.entry.state = state.or(branchBlockInfo.entry.state);

                                modified = true;
                            }

                            // We're already analyzing this branch, it must be a loop
                            if (branchBlockInfo.isAnalyzing) {
                                // Mark if we've modified it 
                                branchBlockInfo.modifiedDuringAnalysis ||= modified;
                                continue;
                            }

                            analyzeBasicBlock(branch.body);
                        }

                        CatnipCompilerLogger.assert(branchBlockInfo.exit !== null, true, "branchBlockInfo.exit === null");

                        if (branchBlockInfo.doesContinue) {
                            if (branchesExitState === null) {
                                branchesExitState = {
                                    stack: branchBlockInfo.exit.stack.clone(),
                                    state: branchBlockInfo.exit.state.clone(),
                                };
                            } else {
                                branchesExitState.stack = branchesExitState.stack.or(branchBlockInfo.exit.stack);
                                branchesExitState.state = branchesExitState.state.or(branchBlockInfo.exit.state);
                            }
                        }
                    }

                    if (branchesExitState === null) {
                        if (opContinues) {
                            CatnipCompilerLogger.assert(!opContinues, true, "Branch has no continuing branches, but continues?");
                        }
                    } else {
                        stack = branchesExitState.stack;
                        state = branchesExitState.state;
                    }
                }

                if (op.type.isInput) {
                    const inputOp = op as CatnipIrInputOp;
                    const result = op.type.getResult(inputOp, state);

                    stack.push(result, inputOp);
                }

                op.type.applyState(op, state);

                if (!opContinues) {
                    blockInfo.doesContinue = false;
                    break;
                }

                op = op.next;
            }
        } while (blockInfo.modifiedDuringAnalysis);

        blockInfo.isAnalyzing = false;

        blockInfo.exit = {
            state, stack
        };
    }

    blockInfos.set(
        func.body,
        {
            isAnalyzing: false,
            modifiedDuringAnalysis: false,

            entry: {
                stack: new CatnipCompilerStack(),
                state: new CatnipCompilerState()
            },

            exit: null,
            doesContinue: true,
        }
    );

    analyzeBasicBlock(func.body);
}

export const LoopPassTypeAnalysis: CatnipCompilerPass = {

    stage: CatnipCompilerStage.PASS_ANALYSIS,

    run(ir: CatnipReadonlyIr): void {
        for (const func of ir.functions) {
            doTypeAnalysis(func as CatnipIrFunction);
        }
    }
}

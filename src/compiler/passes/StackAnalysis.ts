import { CatnipCompilerLogger } from "../CatnipCompilerLogger";
import { CatnipCompilerStack } from "../CatnipCompilerStack";
import { CatnipCompilerValue } from "../CatnipCompilerValue";
import { CatnipIrBasicBlock } from "../CatnipIrBasicBlock";
import { CatnipIrInputOp, CatnipIrOp } from "../CatnipIrOp";

export interface StackValue {
    producer: OperatorStackAnalysis;
    consumer: OperatorStackAnalysis;
    value: CatnipCompilerValue;
}

export interface OperatorStackAnalysis {
    operator: CatnipIrOp;
    operands: StackValue[];
    result: StackValue | null;
}

export function analyzeBlockStack(block: CatnipIrBasicBlock): Map<CatnipIrOp, OperatorStackAnalysis> {

    const opMap: Map<CatnipIrOp, OperatorStackAnalysis> = new Map();
    const stack = new CatnipCompilerStack();

    let op = block.head;

    while (op !== null) {
        const operandCount = op.type.getOperandCount(op.inputs, op.branches);

        const operands = stack.popDetailed(operandCount);

        const operatorAnalysis: OperatorStackAnalysis = {
            operator: op,
            operands: [],
            result: null,
        };

        for (const operand of operands) {
            const sourceAnalysis = opMap.get(operand.source!);

            CatnipCompilerLogger.assert(sourceAnalysis !== undefined);
            CatnipCompilerLogger.assert(sourceAnalysis.result !== null);
            CatnipCompilerLogger.assert(sourceAnalysis.result.consumer === null);

            sourceAnalysis.result.consumer = operatorAnalysis;
            operatorAnalysis.operands.push(sourceAnalysis.result);
        }

        if (op.type.isInput) {
            const castOp = (op as CatnipIrInputOp);

            const result = op.type.getResult(castOp);

            operatorAnalysis.result = {
                producer: operatorAnalysis,
                consumer: null!, // Will be filled in
                value: result
            };

            stack.push(result, castOp);
        }

        opMap.set(op, operatorAnalysis);

        op = op.next;
    }

    return opMap;
}

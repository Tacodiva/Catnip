import { SpiderExpression, SpiderLocal, SpiderLocalReference, SpiderNumberType, SpiderOpcode, SpiderOpcodes } from "wasm-spider";
import { CatnipCompiler } from "./CatnipCompiler";
import { CatnipRuntimeModuleFunctionName } from "../runtime/CatnipRuntimeModuleFunctions";
import { CatnipIrExternalValueSourceType, CatnipIrFunction, CatnipIrExternalLocationType } from './CatnipIrFunction';
import { createLogger, Logger } from "../log";
import { CatnipWasmStructThread } from "../wasm-interop/CatnipWasmStructThread";
import { CatnipCompilerReadonlyStack, CatnipCompilerStack } from "./CatnipCompilerStack";
import { CatnipOpInputs } from "../ops";
import { CatnipIrInputOp, CatnipIrInputOpType, CatnipIrOp, CatnipIrOpBranches, CatnipIrOpBranchesDefinition, CatnipIrOpType, CatnipReadonlyIrInputOp, CatnipReadonlyIrOp } from "./CatnipIrOp";
import { CatnipIrBasicBlock } from "./CatnipIrBasicBlock";
import { CatnipValueFormatUtils } from "./CatnipValueFormatUtils";
import { CatnipSprite, CatnipSpriteID } from "../runtime/CatnipSprite";
import { CatnipCompilerLogger } from "./CatnipCompilerLogger";
import { ir_procedure_trigger, ir_procedure_trigger_inputs } from "./ir/procedure/procedure_trigger";
import { CatnipProcedureID } from "../ops/procedure/procedure_definition";
import { CatnipIrBranch, CatnipIrBranchType } from "./CatnipIrBranch";
import { CatnipCompilerProcedureSubsystem } from "./subsystems/CatnipCompilerProcedureSubsystem";
import { CatnipIrTransientVariable } from "./CatnipIrTransientVariable";
import { CatnipEventID } from "../CatnipEvents";
import { CatnipValueFormat } from "./CatnipValueFormat";
import { VALUE_STRING_UPPER } from "../wasm-interop/CatnipWasmStructValue";
import { CatnipProject } from "../runtime/CatnipProject";

export interface CatnipCompilerWasmLocal {
    ref: SpiderLocalReference,
    type: SpiderNumberType
}

export class CatnipCompilerWasmGenContext {
    public static readonly logger: Logger = createLogger("CatnipCompilerWasmGenContext");

    public readonly compiler: CatnipCompiler;
    public get projectModule() { return this.compiler.spiderModule; }
    public get spiderModule() { return this.compiler.spiderModule; }
    public get runtimeModule() { return this.compiler.runtimeModule; }

    public get project(): CatnipProject { return this.compiler.project; }
    public get spriteID(): CatnipSpriteID { return this.func.spriteID; }
    public get sprite(): CatnipSprite { return this.func.sprite; }

    private _func: CatnipIrFunction;
    public get func() { return this._func; }

    private _expressionNullable: SpiderExpression | null;
    private _expressions: SpiderExpression[];

    private get _expression(): SpiderExpression {
        CatnipCompilerWasmGenContext.logger.assert(
            this._expressionNullable !== null,
            true, "No expression to write to."
        );

        return this._expressionNullable;
    }

    private _locals: Map<SpiderNumberType, CatnipCompilerWasmLocal[]>;
    private _unreleasedLocalCount: number;

    private _procedureArgs: CatnipCompilerWasmLocal[][];

    private _blockDepth: number;
    public get blockDepth() { return this._blockDepth; }

    private readonly _stack: CatnipCompilerStack;
    public get stack(): CatnipCompilerReadonlyStack { return this._stack; }

    public constructor(func: CatnipIrFunction) {
        this.compiler = func.compiler;
        this._func = func;
        this._expressionNullable = null;
        this._expressions = [];
        this.pushExpression(this._func.spiderFunction.body);

        this._locals = new Map();
        this._unreleasedLocalCount = 0;

        this._procedureArgs = [];

        this._blockDepth = 0;

        this._stack = new CatnipCompilerStack();

        if (this._func.stackSize !== 0) {
            const stackPtrLocal = this.createLocal(SpiderNumberType.i32);
            let first = true;

            for (const variableInfo of this._func.transientVariables) {
                if (variableInfo.source === null) continue;

                const location = variableInfo.source.location;

                if (location.type !== CatnipIrExternalLocationType.STACK)
                    continue;

                if (first) {
                    this.emitWasmGetStackPtr();
                    this.emitWasm(SpiderOpcodes.local_tee, stackPtrLocal.ref);

                    first = false;
                } else {
                    this.emitWasm(SpiderOpcodes.local_get, stackPtrLocal.ref);
                }

                switch (variableInfo.variable.type) {
                    case SpiderNumberType.i32:
                        this.emitWasmConst(SpiderNumberType.i32, location.stackOffset - this._func.stackSize);
                        this.emitWasm(SpiderOpcodes.i32_add);
                        this.emitWasm(SpiderOpcodes.i32_load, 2, 0);
                        break;
                    case SpiderNumberType.f64:
                        this.emitWasmConst(SpiderNumberType.i32, location.stackOffset - this._func.stackSize);
                        this.emitWasm(SpiderOpcodes.i32_add);
                        this.emitWasm(SpiderOpcodes.f64_load, 2, 0);
                        break;
                    default:
                        CatnipCompilerWasmGenContext.logger.assert(
                            false,
                            true, "Unsupported stack value type."
                        );
                }

                this.emitWasm(SpiderOpcodes.local_set, this._func.getTransientVariableRef(variableInfo.variable));
            }

            this.releaseLocal(stackPtrLocal);
        }
    }

    public pushExpression(expr?: SpiderExpression) {
        if (this._expressionNullable !== null) {
            this._expressions.push(this._expressionNullable);
        } else {
            CatnipCompilerWasmGenContext.logger.assert(this._expressions.length === 0);
        }
        this._expressionNullable = expr ?? new SpiderExpression();
        ++this._blockDepth;
    }

    public popExpression(): SpiderExpression {
        const expression = this._expressionNullable;
        CatnipCompilerWasmGenContext.logger.assert(this._expressions.length !== 0);
        this._expressionNullable = this._expressions.pop() ?? null;
        --this._blockDepth;
        return expression!;
    }

    public emitBranch(branch: CatnipIrBranch, forceReturn: boolean = false): SpiderExpression {
        this.pushExpression();
        this.emitBranchInline(branch, forceReturn);
        return this.popExpression();
    }

    public emitBranchInline(branch: CatnipIrBranch, forceReturn: boolean = false) {
        if (branch.body.isFuncBody) {
            const targetFunc = branch.body.func;

            const isYielding = branch.body.isYielding() || forceReturn;

            this.prepareStackForCall(branch, isYielding);

            this.emitWasmGetThread();

            for (const parameter of targetFunc.parameters) {
                if (parameter.type === CatnipIrExternalValueSourceType.TRANSIENT_VARIABLE) {

                    this.emitWasm(SpiderOpcodes.local_get, this._func.getTransientVariableRef(parameter.variable));

                } else if (parameter.type === CatnipIrExternalValueSourceType.PROCEDURE_INPUT) {

                    const argIdx = parameter.index;

                    const localVar = this._getProcedureArg(argIdx);
                    this.emitWasm(SpiderOpcodes.local_get, localVar.ref);

                } else if (parameter.type === CatnipIrExternalValueSourceType.RETURN_LOCATION) {

                    if (branch.branchType !== CatnipIrBranchType.EXTERNAL || branch.returnLocation === null)
                        throw new Error("Cannot call function which requires return location, branch does not have a return location.");
                    CatnipCompilerLogger.assert(branch.returnLocation.body.isFuncBody);

                    this.emitWasmConst(SpiderNumberType.i32, branch.returnLocation.body.func.functionTableIndex);

                } else throw new Error("Not reachable.");
            }

            if (targetFunc.isEntrypoint) {
                const trigger = targetFunc.ir.trigger;
                if (trigger.type !== ir_procedure_trigger) throw new Error("Can only call function from another IR if it's a procedure.");
                const triggerInputs = trigger.inputs as ir_procedure_trigger_inputs;
                for (let i = 0; i < triggerInputs.args.length; i++) {
                    const arg = this._procedureArgs[i].pop();
                    CatnipCompilerLogger.assert(arg !== undefined, false, `No procedure argument at ${i}`)
                    if (arg !== undefined) this.releaseLocal(arg);
                }
            }

            if (isYielding && this.compiler.config.enable_tail_call) {
                this.emitWasm(SpiderOpcodes.return_call, targetFunc.spiderFunction);
            } else {
                this.emitWasm(SpiderOpcodes.call, targetFunc.spiderFunction);

                if (isYielding) {
                    this.emitWasm(SpiderOpcodes.return);
                }
            }
        } else {
            CatnipCompilerWasmGenContext.logger.assert(
                branch.branchType === CatnipIrBranchType.INTERNAL,
                true, "Branch must be internal or a function body."
            );

            CatnipCompilerWasmGenContext.logger.assert(
                branch.body.func === this._func,
                true, "Branch must be a part of the current function or a function body."
            );

            this.emitOps(branch.body);

            if (forceReturn && !branch.body.isYielding()) {
                this.cleanStack();
                this.emitWasm(SpiderOpcodes.return);
            }
        }
    }

    public emitOps(branch: CatnipIrBasicBlock) {
        branch.blockDepth = this._blockDepth;
        if (branch.isLoop) {
            this.pushExpression();
            let op = branch.head;
            while (op !== null) {
                this.emitOp(op, branch);
                op = op.next;
            }
            this.emitWasm(SpiderOpcodes.loop, this.popExpression());
        } else {
            let op = branch.head;
            while (op !== null) {
                this.emitOp(op, branch);
                op = op.next;
            }
        }
    }

    public emitOp<
        TInputs extends CatnipOpInputs,
        TBranches extends CatnipIrOpBranches,
        TOpType extends CatnipIrOpType<TInputs, TBranches>
    >(op: CatnipIrOp<TInputs, TBranches, TOpType>, block: CatnipIrBasicBlock) {
        op.type.generateWasm(this, op, block);

        const opernadCount = op.type.getOperandCount(op.inputs, op.branches);

        if (this._stack.length < opernadCount)
            throw new Error(`Not enough values on stack for op ${op.type.name}`);

        const operands = this._stack.pop(opernadCount);

        if (op.type.isInput) {
            this._stack.push(
                op.type.getResult(op as CatnipReadonlyIrOp<TInputs, TBranches, CatnipIrInputOpType<TInputs, CatnipIrOpBranchesDefinition>>),
                op as CatnipIrInputOp
            );
        }
    }

    public createHeapString(str: string): number {
        return this.runtimeModule.createCanonHString(str);
    }

    public emitWasmConst(type: SpiderNumberType, value: number | bigint): void {
        this._expression.emitConstant(type, value);
    }

    public emitWasm<T extends any[]>(opcode: SpiderOpcode<T>, ...args: T): void {
        this._expression.emit(opcode, ...args);
    }

    public emitWasmRuntimeFunctionCall(funcName: CatnipRuntimeModuleFunctionName) {
        this.emitWasm(SpiderOpcodes.call, this.compiler.getRuntimeFunction(funcName));
    }

    public emitWasmGetRuntime() {
        this.emitWasmConst(SpiderNumberType.i32, this.compiler.runtimeInstance.ptr);
    }

    public emitWasmGetThread() {
        this.emitWasm(SpiderOpcodes.local_get, this.func.spiderThreadParam);
    }

    public emitWasmGetCurrentTarget() {
        this.emitWasmGetThread();
        this.emitWasm(SpiderOpcodes.i32_load, 2, CatnipWasmStructThread.getMemberOffset("target"));
    }

    public emitWasmGetStackPtr() {
        this.emitWasmGetThread();
        this.emitWasm(SpiderOpcodes.i32_load, 2, CatnipWasmStructThread.getMemberOffset("stack_ptr"));
    }

    public emitWasmGetStackEnd() {
        this.emitWasmGetThread();
        this.emitWasm(SpiderOpcodes.i32_load, 2, CatnipWasmStructThread.getMemberOffset("stack_end"));
    }

    public emitWasmGetSprite() {
        this.emitWasmConst(SpiderNumberType.i32, this.sprite.structWrapper.ptr);
    }

    public emitWasmCallEvent(event: CatnipEventID, emitArgs: () => void) {
        const func = this.compiler.getEventFunction(event);
        if (func !== null) {
            emitArgs();
            this.emitWasm(SpiderOpcodes.call, func);
        }
    }

    public prepareStackForCall(branch: CatnipIrBranch, tailCall: boolean) {

        if (branch.branchType === CatnipIrBranchType.EXTERNAL && branch.returnLocation !== null) {
            this.prepareStackForCall(branch.returnLocation, tailCall);
            tailCall = false;
        }

        const targetFunc = branch.body.func;

        let baseStackPtrVar: CatnipCompilerWasmLocal | null = null;

        if (tailCall) {
            if (this._func.stackSize !== 0) {
                this.emitWasmGetThread();

                this.emitWasmGetStackPtr();
                this.emitWasmConst(SpiderNumberType.i32, this._func.stackSize);
                this.emitWasm(SpiderOpcodes.i32_sub);

                baseStackPtrVar = this.createLocal(SpiderNumberType.i32);
                this.emitWasm(SpiderOpcodes.local_tee, baseStackPtrVar.ref);

                this.emitWasm(SpiderOpcodes.i32_store, 2, CatnipWasmStructThread.getMemberOffset("stack_ptr"));
            }
        }

        if (targetFunc.stackSize !== 0) {
            this.emitWasmGetStackEnd();

            // Get the stack pointer
            if (baseStackPtrVar !== null) {
                this.emitWasm(SpiderOpcodes.local_get, baseStackPtrVar.ref);
            } else {
                this.emitWasmGetStackPtr();
                baseStackPtrVar = this.createLocal(SpiderNumberType.i32);
                this.emitWasm(SpiderOpcodes.local_tee, baseStackPtrVar.ref);
            }

            // Add the stack size
            this.emitWasmConst(SpiderNumberType.i32, targetFunc.stackSize);
            this.emitWasm(SpiderOpcodes.i32_add);

            // Save the new stack pointer
            const newStackPtrVar = this.createLocal(SpiderNumberType.i32);
            this.emitWasm(SpiderOpcodes.local_tee, newStackPtrVar.ref);

            // (stackEnd < stackPtr + targetFunc.stackSize)
            this.emitWasm(SpiderOpcodes.i32_lt_u);

            this.pushExpression();
            // if {
            this.emitWasmGetThread();
            CatnipCompilerLogger.assert(targetFunc.stackSize % 8 === 0);
            this.emitWasmConst(SpiderNumberType.i32, targetFunc.stackSize / 8);
            this.emitWasmRuntimeFunctionCall("catnip_thread_resize_stack");

            this.emitWasmGetStackPtr();
            // Update the old stack pointer
            this.emitWasm(SpiderOpcodes.local_tee, baseStackPtrVar.ref);

            // Update the new stack pointer
            this.emitWasmConst(SpiderNumberType.i32, targetFunc.stackSize);
            this.emitWasm(SpiderOpcodes.i32_add);
            this.emitWasm(SpiderOpcodes.local_set, newStackPtrVar.ref);
            // }

            this.emitWasm(SpiderOpcodes.if, this.popExpression());

            for (const transientVariable of targetFunc.externalValues) {

                if (transientVariable.location.type !== CatnipIrExternalLocationType.STACK)
                    continue;


                this.emitWasm(SpiderOpcodes.local_get, baseStackPtrVar.ref);

                let valueType: SpiderNumberType;
                let valueFormat: CatnipValueFormat;

                if (transientVariable.value.type === CatnipIrExternalValueSourceType.TRANSIENT_VARIABLE) {

                    const variableRef = this._func.getTransientVariableRef(transientVariable.value.variable);
                    this.emitWasm(SpiderOpcodes.local_get, variableRef);
                    valueType = transientVariable.value.variable.type;
                    valueFormat = transientVariable.value.variable.format;

                } else if (transientVariable.value.type === CatnipIrExternalValueSourceType.PROCEDURE_INPUT) {

                    const argIdx = transientVariable.value.index;
                    const localVar = this._getProcedureArg(argIdx);
                    this.emitWasm(SpiderOpcodes.local_get, localVar.ref);
                    valueType = localVar.type;
                    valueFormat = CatnipValueFormat.F64;
                    CatnipCompilerLogger.assert(valueType == SpiderNumberType.f64);

                } else if (transientVariable.value.type === CatnipIrExternalValueSourceType.RETURN_LOCATION) {

                    if (branch.branchType !== CatnipIrBranchType.EXTERNAL || branch.returnLocation === null)
                        throw new Error("Cannot call function which requires return location, branch does not have a return location.");
                    CatnipCompilerLogger.assert(branch.returnLocation.body.isFuncBody);

                    this.emitWasmConst(SpiderNumberType.i32, branch.returnLocation.body.func.functionTableIndex);
                    valueType = SpiderNumberType.i32;
                    valueFormat = CatnipValueFormat.I32_NUMBER;

                } else throw new Error("Unreachable.")


                switch (valueType) {
                    case SpiderNumberType.i32:
                        // We store it as a boxed f64 then undo this when we load it from the stack again
                        if (CatnipValueFormatUtils.isAlways(valueFormat, CatnipValueFormat.I32_HSTRING)) {
                            // This is so GC can track we're using this string
                            this.emitWasm(SpiderOpcodes.i32_store, 2, transientVariable.location.stackOffset);

                            // Store the upper bits
                            this.emitWasm(SpiderOpcodes.local_get, baseStackPtrVar.ref);
                            this.emitWasmConst(SpiderNumberType.i32, VALUE_STRING_UPPER);
                            this.emitWasm(SpiderOpcodes.i32_store, 2, transientVariable.location.stackOffset + 4);
                        } else if (CatnipValueFormatUtils.isAlways(valueFormat, CatnipValueFormat.I32_NUMBER)) {
                            this.emitWasm(SpiderOpcodes.i32_store, 2, transientVariable.location.stackOffset);

                            // Clear the upper bits
                            this.emitWasm(SpiderOpcodes.local_get, baseStackPtrVar.ref);
                            this.emitWasmConst(SpiderNumberType.i32, 0);
                            this.emitWasm(SpiderOpcodes.i32_store, 2, transientVariable.location.stackOffset + 4);
                        } else {
                            CatnipCompilerWasmGenContext.logger.assert(
                                false,
                                true, `Unsupported stack I32 type '${CatnipValueFormatUtils.stringify(valueFormat)}'.`
                            );
                        }
                        break;
                    case SpiderNumberType.f64:
                        this.emitWasm(SpiderOpcodes.f64_store, 3, transientVariable.location.stackOffset);
                        break;
                    default:
                        CatnipCompilerWasmGenContext.logger.assert(
                            false,
                            true, "Unsupported stack value type."
                        );
                }
            }

            this.emitWasmGetThread();
            this.emitWasm(SpiderOpcodes.local_get, newStackPtrVar.ref);
            this.emitWasm(SpiderOpcodes.i32_store, 2, CatnipWasmStructThread.getMemberOffset("stack_ptr"));

            this.releaseLocal(newStackPtrVar);
        }

        if (baseStackPtrVar !== null) {
            this.releaseLocal(baseStackPtrVar);
        }
    }

    public cleanStack() {
        if (this._func.stackSize !== 0) {
            this.emitWasmGetThread();
            this.emitWasmGetStackPtr();
            this.emitWasmConst(SpiderNumberType.i32, this._func.stackSize);
            this.emitWasm(SpiderOpcodes.i32_sub);
            this.emitWasm(SpiderOpcodes.i32_store, 2, CatnipWasmStructThread.getMemberOffset("stack_ptr"));
        }
    }

    public createLocal(type: SpiderNumberType): CatnipCompilerWasmLocal {
        ++this._unreleasedLocalCount;

        const locals = this._locals.get(type);

        if (locals === undefined || locals.length === 0) {
            return { ref: this.func.spiderFunction.addLocalVariable(type), type };
        } else {
            return locals.pop()!;
        }
    }

    private _getProcedureArg(argIdx: number) {
        const args = this._procedureArgs[argIdx];
        if (args.length === 0) throw new Error(`No argument assigned to index ${argIdx}.`);
        return args[args.length - 1];
    }

    public createProcedureArgLocal(spriteID: CatnipSpriteID, procedureID: CatnipProcedureID, argIdx: number): CatnipCompilerWasmLocal {
        const procedure = this.compiler.getSubsystem(CatnipCompilerProcedureSubsystem).getProcedureInfo(spriteID, procedureID);
        const argumentInfo = procedure.inputs.args[argIdx];
        const argumentType = CatnipValueFormatUtils.getFormatSpiderType(argumentInfo.format);

        let currentProcedureArgs = this._procedureArgs[argIdx];

        if (currentProcedureArgs === undefined)
            currentProcedureArgs = this._procedureArgs[argIdx] = [];

        const local = this.createLocal(argumentType);

        currentProcedureArgs.push(local);

        return local;
    }

    public releaseLocal(local: CatnipCompilerWasmLocal) {
        --this._unreleasedLocalCount;

        let locals = this._locals.get(local.type);

        if (locals === undefined) {
            locals = [];
            this._locals.set(local.type, locals);
        }

        locals.push(local);
    }

    public getTransientVariableRef(variable: CatnipIrTransientVariable): SpiderLocalReference {
        return this.func.getTransientVariableRef(variable);
    }

    public finish() {
        if (this._unreleasedLocalCount !== 0)
            CatnipCompilerLogger.warn(`WASM generation of function '${this.func.name}' has unreleased locals.`);

        for (const procedureArgs of this._procedureArgs) {
            if (procedureArgs !== undefined && procedureArgs.length !== 0) {
                CatnipCompilerLogger.warn(`WASM generation of function '${this.func.name}' has unreleased procedure args.`);
                break;
            }
        }
    }

}

import { SpiderExpression, SpiderFunction, SpiderFunctionDefinition, SpiderLocalParameterReference, SpiderLocalReference, SpiderLocalVariableReference, SpiderNumberType, SpiderOpcode, SpiderOpcodes, SpiderReferenceType, SpiderValueType } from "wasm-spider";
import { CatnipRuntimeModuleFunctionName } from "../../runtime/CatnipRuntimeModuleFunctions";
import { CatnipWasmStructThread } from "../../wasm-interop/CatnipWasmStructThread";
import { VALUE_STRING_MASK, VALUE_STRING_UPPER } from "../../wasm-interop/CatnipWasmStructValue";
import { CatnipCompilerLogger } from "../CatnipCompilerLogger";
import { CatnipValueFormat } from "../CatnipValueFormat";
import { CatnipValueFormatUtils } from "../CatnipValueFormatUtils";
import { IR1ExternalValue, IR1ExternalValueType } from "../ir1/IR1ExternalValue";
import { IR1ExternalValueSourceType, IR1Function } from "../ir1/IR1Function";
import { IR1Instruction } from "../ir1/IR1Instruction";
import { IR1ToWasmInfo } from '../ir1/IR1ToWasmInfo';
import { IR1Trigger } from "../ir1/IR1Trigger";
import { CatnipWasmStructRuntime } from "../../wasm-interop/CatnipWasmStructRuntime";

export type CatnipCompilerWasmEmitStackFrame = {
    local: SpiderLocalReference,
    format: CatnipValueFormat
}[];

interface GCFrameInfo {
    gcIndex: SpiderLocalReference | null;
    frame: CatnipCompilerWasmEmitStackFrame;
}

export type CatnipCompilerWasmEmitFunc = ((emitter: CatnipCompilerWasmEmitter) => void) | IR1Instruction[];

export class CatnipCompilerWasmEmitter {

    public get module() { return this.conversionInfo.module; }
    public get compiler() { return this.module.compiler; }
    public get spiderModule() { return this.module.spiderModule; }
    public get runtimeModule() { return this.module.runtimeModule; }
    public get runtimeInstance() { return this.module.runtimeInstance; }

    public readonly conversionInfo: IR1ToWasmInfo;

    public readonly ir1Function: IR1Function;
    public readonly spiderFunction: SpiderFunctionDefinition;

    public get spriteID() { return this.ir1Function.script.spriteID; }
    public get sprite() { return this.compiler.project.getSprite(this.spriteID); }

    private readonly _threadParameter: SpiderLocalParameterReference;
    private readonly _externalValueReferences: readonly SpiderLocalReference[];
    private readonly _createdTransients: readonly SpiderLocalVariableReference[];

    private _expression: SpiderExpression;

    private _locals: Map<SpiderValueType, SpiderLocalReference[]>;
    private _borrowedLocals: Map<SpiderLocalReference, CatnipValueFormat>;

    private _gcFrameInfo: GCFrameInfo | null;

    public constructor(conversionInfo: IR1ToWasmInfo, func: IR1Function) {
        this.conversionInfo = conversionInfo;
        this.ir1Function = func;

        this.spiderFunction = this.conversionInfo.getSpiderFunction(func);
        this._expression = this.spiderFunction.body;
        this._locals = new Map();
        this._borrowedLocals = new Map();

        this._gcFrameInfo = null;

        CatnipCompilerLogger.assert(this.spiderFunction.parameters.length === 0);

        const externalValueReferences: SpiderLocalReference[] = [];

        if (this.ir1Function.externalValueSource === IR1ExternalValueSourceType.PARAMETERS) {
            for (const externalValue of this.ir1Function.externalValues) {
                externalValueReferences.push(this.spiderFunction.addParameter(IR1ExternalValue.getSpiderType(externalValue)));
            }
        }

        this._threadParameter = this.spiderFunction.addParameter(SpiderNumberType.i32);

        if (this.ir1Function.externalValueSource === IR1ExternalValueSourceType.STACK) {

            const frame: CatnipCompilerWasmEmitStackFrame = [];

            for (const externalValue of this.ir1Function.externalValues) {
                const format = IR1ExternalValue.getFormat(externalValue);
                const local = this.spiderFunction.addLocalVariable(CatnipValueFormatUtils.getFormatSpiderType(format));
                frame.push({ local, format });
                externalValueReferences.push(local)
            }

            // The values were stored in reverse, so we pop them in reverse too
            this.emitPopFrame(frame.reverse());
        }

        this._externalValueReferences = externalValueReferences;

        // Create the locals for transient variables this function creates
        const createdTransients: SpiderLocalVariableReference[] = [];

        for (const transient of this.ir1Function.createdTransients) {
            createdTransients.push(
                this.spiderFunction.addLocalVariable(
                    CatnipValueFormatUtils.getFormatSpiderType(transient.format)
                )
            );
        }

        this._createdTransients = createdTransients;

    }

    public emitTriggerEntry(trigger: IR1Trigger) {
        trigger.emitEntryWasm(this);
    }

    public emitInstructions(instrs: IR1Instruction[]): void {
        for (const instr of instrs)
            instr.emitWasm(this);
    }

    public emitWasm<T extends any[]>(opcode: SpiderOpcode<T>, ...args: T): void {
        this._expression.emit(opcode, ...args);
    }

    public emitWasmBlock(emitFunc: CatnipCompilerWasmEmitFunc, type?: SpiderValueType): void {
        this.emitWasm(SpiderOpcodes.block, this.emitExpression(emitFunc), type);
    }

    public emitWasmLoop(emitFunc: CatnipCompilerWasmEmitFunc, type?: SpiderValueType): void {
        this.emitWasm(SpiderOpcodes.loop, this.emitExpression(emitFunc), type);
    }

    public emitWasmIf(trueEmit: CatnipCompilerWasmEmitFunc, falseEmit?: CatnipCompilerWasmEmitFunc, type?: SpiderValueType): void {
        this.emitWasm(SpiderOpcodes.if, this.emitExpression(trueEmit), falseEmit ? this.emitExpression(falseEmit) : undefined, type);
    }

    public emitWasmPushNumber(type: SpiderNumberType, value: number | bigint): void {
        this._expression.emitConstant(type, value);
    }

    public createCanonHString(str: string): number {
        return this.runtimeModule.createCanonHString(str);
    }

    public emitWasmPushString(str: string): void {
        this.emitWasmPushNumber(SpiderNumberType.i32, this.createCanonHString(str));
    }

    public emitWasmPushBoxedString(str: string): void {
        this.emitWasmPushNumber(SpiderNumberType.i64, VALUE_STRING_MASK | BigInt(this.createCanonHString("")));
        this.emitWasm(SpiderOpcodes.f64_reinterpret_i64);
    }

    public emitWasmCall(func: SpiderFunction, callWithoutEffects: boolean = false) {
        if (callWithoutEffects && this.compiler.config.enable_optimization_binaryen) {            
            this.emitWasm(SpiderOpcodes.ref_func, func);
    
            this.emitWasm(SpiderOpcodes.call, 
                this.module.getBinaryenIntrinsic("call.without.effects",
                    [...func.type.parameters, SpiderReferenceType.funcref],
                    ...func.type.results
                )
            );
        } else {
            this.emitWasm(SpiderOpcodes.call, func);
        }
    }

    public emitWasmRuntimeFunctionCall(funcName: CatnipRuntimeModuleFunctionName, callWithoutEffects: boolean = false) {
        this.emitWasmCall(this.module.getRuntimeFunction(funcName), callWithoutEffects);
    }

    public emitWasmPushRuntime() {
        this.emitWasmPushNumber(SpiderNumberType.i32, this.runtimeInstance.ptr);
    }

    public emitWasmPushThread() {
        this.emitWasm(SpiderOpcodes.local_get, this._threadParameter);
    }

    public emitWasmPushCurrentTarget() {
        this.emitWasmPushThread();
        this.emitWasm(SpiderOpcodes.i32_load, 2, CatnipWasmStructThread.getMemberOffset("target"));
    }
    public emitWasmPushStackPtr() {
        this.emitWasmPushThread();
        this.emitWasm(SpiderOpcodes.i32_load, 2, CatnipWasmStructThread.getMemberOffset("stack_ptr"));
    }

    public emitWasmPushStackEnd() {
        this.emitWasmPushThread();
        this.emitWasm(SpiderOpcodes.i32_load, 2, CatnipWasmStructThread.getMemberOffset("stack_end"));
    }

    public getExternalValueLocal(value: IR1ExternalValue): SpiderLocalReference {
        if (value.type === IR1ExternalValueType.TRANSIENT_VARIABLE) {
            // If this function creates the transient, then it is in the created transients array
            //   not the external values array.
            const createdTransientIndex = this.ir1Function.createdTransients.indexOf(value.var);

            if (createdTransientIndex !== -1) {
                return this._createdTransients[createdTransientIndex];
            }
        }

        CatnipCompilerLogger.assert(this.ir1Function.externalValues.length === this._externalValueReferences.length);

        for (let i = 0; i < this.ir1Function.externalValues.length; i++) {
            const externalValue = this.ir1Function.externalValues[i];

            if (IR1ExternalValue.areEquivalent(value, externalValue)) {
                return this._externalValueReferences[i];
            }
        }

        throw new Error(`Function does not have required external value ${IR1ExternalValue.stringify(value)}.`);
    }

    public emitExpression(emitter: CatnipCompilerWasmEmitFunc): SpiderExpression {
        const oldExpressoin = this._expression;
        const newExpression = new SpiderExpression();

        this._expression = newExpression;

        if (Array.isArray(emitter)) {
            this.emitInstructions(emitter);
        } else {
            emitter(this);
        }

        this._expression = oldExpressoin;

        return newExpression;
    }

    public borrowLocal(format: CatnipValueFormat): SpiderLocalReference {
        const type = CatnipValueFormatUtils.getFormatSpiderType(format);
        let locals = this._locals.get(type);

        if (locals === undefined)
            this._locals.set(type, locals = []);

        let local = locals.pop();

        if (local === undefined)
            local = this.spiderFunction.addLocalVariable(type);

        this._borrowedLocals.set(local, format);

        return local;
    }

    public returnLocal(local: SpiderLocalReference): void {
        let locals = this._locals.get(local.value);

        if (locals === undefined)
            this._locals.set(local.value, locals = []);

        this._borrowedLocals.delete(local);

        locals.push(local);
    }

    public finish() {
        if (this._borrowedLocals.size !== 0)
            CatnipCompilerLogger.warn(`WASM generation of function has unreleased locals.`);
    }

    public emitPushFrame(frame: CatnipCompilerWasmEmitStackFrame) {
        const frameSizeBytes = frame.length * 8;

        if (frameSizeBytes === 0) return;

        this.emitWasmPushStackEnd();

        // Get the stack pointer and save it it a local
        this.emitWasmPushStackPtr();
        const baseStackPtrVar = this.borrowLocal(CatnipValueFormat.I32_NUMBER);
        this.emitWasm(SpiderOpcodes.local_tee, baseStackPtrVar);

        // Add the stack size
        this.emitWasmPushNumber(SpiderNumberType.i32, frameSizeBytes);
        this.emitWasm(SpiderOpcodes.i32_add);

        // Save the new stack pointer
        const newStackPtrVar = this.borrowLocal(CatnipValueFormat.I32_NUMBER);
        this.emitWasm(SpiderOpcodes.local_tee, newStackPtrVar);

        // (stackEnd < stackPtr + targetFunc.stackSize)
        this.emitWasm(SpiderOpcodes.i32_lt_u);

        this.emitWasmIf(emitter => {
            // The stack is not big enough :c, let's resize it :3
            emitter.emitWasmPushThread();
            emitter.emitWasmPushNumber(SpiderNumberType.i32, frame.length);
            emitter.emitWasmRuntimeFunctionCall("catnip_thread_resize_stack");

            emitter.emitWasmPushStackPtr();
            // Update the base stack pointer local
            emitter.emitWasm(SpiderOpcodes.local_tee, baseStackPtrVar);

            // Update the new stack pointer local
            emitter.emitWasmPushNumber(SpiderNumberType.i32, frameSizeBytes);
            emitter.emitWasm(SpiderOpcodes.i32_add);
            emitter.emitWasm(SpiderOpcodes.local_set, newStackPtrVar);
        });

        let stackOffset = 0;

        for (const frameValue of frame) {

            this.emitWasm(SpiderOpcodes.local_get, baseStackPtrVar);
            this.emitWasm(SpiderOpcodes.local_get, frameValue.local);

            // We store it as a boxed f64 then undo this when we load it from the stack again
            if (CatnipValueFormatUtils.isAlways(frameValue.format, CatnipValueFormat.I32_HSTRING)) {

                // This is so GC can track we're using this string
                this.emitWasm(SpiderOpcodes.i32_store, 2, stackOffset);

                // Store the upper bits
                this.emitWasm(SpiderOpcodes.local_get, baseStackPtrVar);
                this.emitWasmPushNumber(SpiderNumberType.i32, VALUE_STRING_UPPER);
                this.emitWasm(SpiderOpcodes.i32_store, 2, stackOffset + 4);

            } else if (CatnipValueFormatUtils.isAlways(frameValue.format, CatnipValueFormat.I32_NUMBER)) {

                this.emitWasm(SpiderOpcodes.i32_store, 2, stackOffset);

                // Clear the upper bits
                this.emitWasm(SpiderOpcodes.local_get, baseStackPtrVar);
                this.emitWasmPushNumber(SpiderNumberType.i32, 0);
                this.emitWasm(SpiderOpcodes.i32_store, 2, stackOffset + 4);

            } else if (CatnipValueFormatUtils.isAlways(frameValue.format, CatnipValueFormat.F64)) {

                this.emitWasm(SpiderOpcodes.f64_store, 3, stackOffset);

            } else {
                CatnipCompilerLogger.assert(
                    false, true, `Unsupported stack type '${CatnipValueFormatUtils.stringify(frameValue.format)}'.`
                );
            }

            stackOffset += 8;
        }

        this.emitWasmPushThread();
        this.emitWasm(SpiderOpcodes.local_get, newStackPtrVar);
        this.emitWasm(SpiderOpcodes.i32_store, 2, CatnipWasmStructThread.getMemberOffset("stack_ptr"));

        this.returnLocal(baseStackPtrVar);
        this.returnLocal(newStackPtrVar);
    }

    public emitPopFrame(frame: CatnipCompilerWasmEmitStackFrame) {
        const frameSizeBytes = frame.length * 8;

        if (frameSizeBytes === 0) return;

        // We subtract the frame size from the stack pointer to get the base of our frame
        this.emitWasmPushStackPtr();
        this.emitWasmPushNumber(SpiderNumberType.i32, frameSizeBytes);
        this.emitWasm(SpiderOpcodes.i32_sub);

        const stackPointer = this.borrowLocal(CatnipValueFormat.I32_NUMBER);
        this.emitWasm(SpiderOpcodes.local_set, stackPointer);

        let stackOffset = 0;
        // We need to get the values off of the stack.
        for (const frameValue of frame) {

            const spiderType = CatnipValueFormatUtils.getFormatSpiderType(frameValue.format);

            this.emitWasm(SpiderOpcodes.local_get, stackPointer);

            if (spiderType === SpiderNumberType.i32) {
                this.emitWasm(SpiderOpcodes.i32_load, 2, stackOffset);
            } else {
                CatnipCompilerLogger.assert(spiderType === SpiderNumberType.f64);
                this.emitWasm(SpiderOpcodes.f64_load, 3, stackOffset);
            }

            this.emitWasm(SpiderOpcodes.local_set, frameValue.local);
            stackOffset += 8;
        }

        // Now that we've read everything, store the new stack pointer
        this.emitWasmPushThread();
        this.emitWasm(SpiderOpcodes.local_get, stackPointer);
        this.emitWasm(SpiderOpcodes.i32_store, 2, CatnipWasmStructThread.getMemberOffset("stack_ptr"));

        this.returnLocal(stackPointer);
    }

    public createGCFrame(conditional: boolean): void {
        CatnipCompilerLogger.assert(this._gcFrameInfo === null);

        const frame: CatnipCompilerWasmEmitStackFrame = [];

        function pushFrameValue(local: SpiderLocalReference, format: CatnipValueFormat) {
            if (!CatnipValueFormatUtils.isGarbageCollectable(format))
                return;

            frame.push({ local, format });
        }

        // External values

        // Transients we've created
        for (let idx = 0; idx < this.ir1Function.createdTransients.length; idx++) {
            const transient = this.ir1Function.createdTransients[idx];
            const transientLocal = this._createdTransients[idx];
            pushFrameValue(transientLocal, transient.format);
        }

        // External values
        for (let idx = 0; idx < this.ir1Function.externalValues.length; idx++) {
            const externalValue = this.ir1Function.externalValues[idx];
            const externalLocal = this._externalValueReferences[idx];
            pushFrameValue(externalLocal, IR1ExternalValue.getFormat(externalValue));
        }

        // Locals
        for (const [local, format] of this._borrowedLocals) {
            pushFrameValue(local, format);
        }

        this.emitPushFrame(frame);

        let gcIndex: SpiderLocalReference | null = null;

        if (conditional) {
            gcIndex = this.borrowLocal(CatnipValueFormat.I32_NUMBER);

            this.emitWasmPushRuntime();
            this.emitWasm(SpiderOpcodes.i32_load, 2, CatnipWasmStructRuntime.getMemberOffset("gc_index"));
            this.emitWasm(SpiderOpcodes.local_set, gcIndex);
        }

        this._gcFrameInfo = { gcIndex, frame };
    }

    public restoreGCFrame(): void {
        CatnipCompilerLogger.assert(this._gcFrameInfo !== null);

        if (this._gcFrameInfo.gcIndex === null) {
            this.emitPopFrame(this._gcFrameInfo.frame);
        } else {

            const frameInfo = this._gcFrameInfo;

            this.emitWasm(SpiderOpcodes.local_get, this._gcFrameInfo.gcIndex);
            this.emitWasmPushRuntime();
            this.emitWasm(SpiderOpcodes.i32_load, 2, CatnipWasmStructRuntime.getMemberOffset("gc_index"));
            this.emitWasm(SpiderOpcodes.i32_ne);

            this.emitWasmIf(
                emitter => {
                    emitter.emitPopFrame(frameInfo.frame);
                },
                emitter => {
                    const frameSizeBytes = this._gcFrameInfo!.frame.length;

                    if (frameSizeBytes === 0) return;

                    this.emitWasmPushThread();

                    this.emitWasmPushStackPtr();
                    this.emitWasmPushNumber(SpiderNumberType.i32, frameSizeBytes);
                    this.emitWasm(SpiderOpcodes.i32_sub);

                    this.emitWasm(SpiderOpcodes.i32_store, 2, CatnipWasmStructThread.getMemberOffset("stack_ptr"));
                }
            );

            this.returnLocal(this._gcFrameInfo.gcIndex);
        }

        this._gcFrameInfo = null;
    }
}
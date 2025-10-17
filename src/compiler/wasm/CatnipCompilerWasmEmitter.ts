import { SpiderExpression, SpiderFunctionDefinition, SpiderLocalParameterReference, SpiderLocalReference, SpiderLocalVariableReference, SpiderNumberType, SpiderOpcode, SpiderOpcodes, SpiderValueType } from "wasm-spider";
import { CatnipCompilerWasmModule } from "./CatnipCompilerWasmModule";
import { IR1Instruction } from "../ir1/IR1";
import { IR1ExternalValueSourceType, IR1Function } from "../ir1/IR1Function";
import { IR1ToWasmInfo } from '../ir1/IR1ToWasmInfo';
import { CatnipRuntimeModuleFunctionName } from "../../runtime/CatnipRuntimeModuleFunctions";
import { CatnipCompilerLogger } from "../CatnipCompilerLogger";
import { IR1Trigger } from "../ir1/IR1Trigger";
import { CatnipWasmStructThread } from "../../wasm-interop/CatnipWasmStructThread";
import { IR1ExternalValue } from "../ir1/IR1ExternalValue";

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

    public readonly threadParameter: SpiderLocalParameterReference;
    public readonly externalValueReferences: SpiderLocalReference[];

    private _expression: SpiderExpression;

    private _locals: Map<SpiderValueType, SpiderLocalVariableReference[]>;
    private _localsUnreturnedCount: number;

    public constructor(conversionInfo: IR1ToWasmInfo, func: IR1Function) {
        this.conversionInfo = conversionInfo;
        this.ir1Function = func;

        this.spiderFunction = this.conversionInfo.getSpiderFunction(func);
        this._expression = this.spiderFunction.body;
        this._locals = new Map();
        this._localsUnreturnedCount = 0;

        CatnipCompilerLogger.assert(this.spiderFunction.parameters.length === 0);

        this.externalValueReferences = [];

        if (this.ir1Function.externalValueSource === IR1ExternalValueSourceType.PARAMETERS) {
            for (const externalValue of this.ir1Function.externalValues) {
                this.externalValueReferences.push(this.spiderFunction.addParameter(IR1ExternalValue.getSpiderType(externalValue)));
            }
        }

        this.threadParameter = this.spiderFunction.addParameter(SpiderNumberType.i32);

        if (this.ir1Function.externalValueSource === IR1ExternalValueSourceType.STACK) {
            const frameSizeBytes = this.ir1Function.externalValues.length * 8;

            if (frameSizeBytes !== 0) {
                // We subtract the frame size from the stack pointer to get the base of our frame
                this.emitWasmPushStackPtr();
                this.emitWasmPushNumber(SpiderNumberType.i32, frameSizeBytes);
                this.emitWasm(SpiderOpcodes.i32_sub);


                const stackPointer = this.borrowLocal(SpiderNumberType.i32);
                this.emitWasm(SpiderOpcodes.local_set, stackPointer);

                let stackOffset = 0;
                // We need to get the values off of the stack. They were stored in reverse order.
                for (const externalValue of [...this.ir1Function.externalValues].reverse()) {

                    const spiderType = IR1ExternalValue.getSpiderType(externalValue);

                    this.emitWasm(SpiderOpcodes.local_get, stackPointer);

                    if (spiderType === SpiderNumberType.i32) {
                        this.emitWasm(SpiderOpcodes.i32_load, 2, stackOffset);
                    } else {
                        CatnipCompilerLogger.assert(spiderType === SpiderNumberType.f64);
                        this.emitWasm(SpiderOpcodes.f64_load, 3, stackOffset);
                    }

                    const local = this.spiderFunction.addLocalVariable(spiderType);
                    this.emitWasm(SpiderOpcodes.local_set, local);
                    this.externalValueReferences.push(local);

                    stackOffset += 8;
                }

                // Reverse again to go back to the correct order
                this.externalValueReferences.reverse();

                // Now that we've read everything, store the new stack pointer
                this.emitWasmPushThread();
                this.emitWasm(SpiderOpcodes.local_get, stackPointer);
                this.emitWasm(SpiderOpcodes.i32_store, 2, CatnipWasmStructThread.getMemberOffset("stack_ptr"));

                this.returnLocal(stackPointer);
            }
        }

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

    public emitWasmPushNumber(type: SpiderNumberType, value: number | bigint): void {
        this._expression.emitConstant(type, value);
    }

    public createCanonHString(str: string): number {
        return this.runtimeModule.createCanonHString(str);
    }

    public emitWasmPushString(str: string): void {
        this.emitWasmPushNumber(SpiderNumberType.i32, this.createCanonHString(str));
    }

    public emitWasmRuntimeFunctionCall(funcName: CatnipRuntimeModuleFunctionName) {
        this.emitWasm(SpiderOpcodes.call, this.module.getRuntimeFunction(funcName));
    }

    public emitWasmPushRuntime() {
        this.emitWasmPushNumber(SpiderNumberType.i32, this.runtimeInstance.ptr);
    }

    public emitWasmPushThread() {
        this.emitWasm(SpiderOpcodes.local_get, this.threadParameter);
    }

    public emitWasmPushStackPtr() {
        this.emitWasmPushThread();
        this.emitWasm(SpiderOpcodes.i32_load, 2, CatnipWasmStructThread.getMemberOffset("stack_ptr"));
    }

    public emitWasmPushStackEnd() {
        this.emitWasmPushThread();
        this.emitWasm(SpiderOpcodes.i32_load, 2, CatnipWasmStructThread.getMemberOffset("stack_end"));
    }

    public emitWasmPushExternalValue(value: IR1ExternalValue) {
        for (let i = 0; i < this.ir1Function.externalValues.length; i++) {
            const externalValue = this.ir1Function.externalValues[i];

            if (IR1ExternalValue.areEquivalent(value, externalValue)) {
                this.emitWasm(SpiderOpcodes.local_get, this.externalValueReferences[i]);
                return;
            }
        }

        throw new Error("Function does not have required external value.");
    }

    public emitExpression(emitter: ((emitter: CatnipCompilerWasmEmitter) => void) | IR1Instruction[]): SpiderExpression {
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

    public borrowLocal(type: SpiderNumberType): SpiderLocalVariableReference {
        let locals = this._locals.get(type);

        if (locals === undefined)
            this._locals.set(type, locals = []);

        let local = locals.pop();

        if (local === undefined)
            local = this.spiderFunction.addLocalVariable(type);

        ++this._localsUnreturnedCount;

        return local;
    }

    public returnLocal(local: SpiderLocalVariableReference): void {
        let locals = this._locals.get(local.value);

        if (locals === undefined)
            this._locals.set(local.value, locals = []);

        --this._localsUnreturnedCount;

        locals.push(local);
    }

    public finish() {
        if (this._localsUnreturnedCount !== 0)
            CatnipCompilerLogger.warn(`WASM generation of function has unreleased locals.`);
    }
}
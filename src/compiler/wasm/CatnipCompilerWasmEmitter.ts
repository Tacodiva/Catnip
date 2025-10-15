import { SpiderExpression, SpiderFunctionDefinition, SpiderLocalParameterReference, SpiderLocalReference, SpiderLocalVariableReference, SpiderNumberType, SpiderOpcode, SpiderOpcodes, SpiderValueType } from "wasm-spider";
import { CatnipCompilerWasmModule } from "./CatnipCompilerWasmModule";
import { IR1Function, IR1Instruction } from "../ir1/IR1";
import { IR1ToWasmInfo } from '../ir1/IR1ToWasmInfo';
import { CatnipRuntimeModuleFunctionName } from "../../runtime/CatnipRuntimeModuleFunctions";
import { CatnipCompilerLogger } from "../CatnipCompilerLogger";
import { IR1Trigger } from "../ir1/IR1Trigger";

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
        this.threadParameter = this.spiderFunction.addParameter(SpiderNumberType.i32);
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
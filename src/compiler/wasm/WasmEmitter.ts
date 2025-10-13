import { SpiderExpression, SpiderFunctionDefinition, SpiderLocalReference, SpiderLocalVariableReference, SpiderNumberType, SpiderOpcode, SpiderOpcodes, SpiderValueType } from "wasm-spider";
import { CatnipCompilerWasmModule } from "../CatnipCompilerWasmModule";
import { IR1Function, IR1Instruction } from "../ir1/IR1";
import { IR1ToWasmPrepass } from '../ir1/IR1ToWasmPrepass';
import { CatnipRuntimeModuleFunctionName } from "../../runtime/CatnipRuntimeModuleFunctions";
import { CatnipCompilerLogger } from "../CatnipCompilerLogger";

export class WasmEmitter {

    public get module() { return this.prepass.module; }
    public get compiler() { return this.module.compiler; }
    public get spiderModule() { return this.module.spiderModule; }
    public get runtimeModule() { return this.module.runtimeModule; }
    public get runtimeInstance() { return this.module.runtimeInstance; }

    public readonly prepass: IR1ToWasmPrepass;

    public readonly ir1Function: IR1Function;
    public readonly spiderFunction: SpiderFunctionDefinition;

    private _expression: SpiderExpression;

    private _locals: Map<SpiderValueType, SpiderLocalVariableReference[]>;
    private _localsUnreturnedCount: number;

    public constructor(prepass: IR1ToWasmPrepass, func: IR1Function) {
        this.prepass = prepass;
        this.ir1Function = func;

        this.spiderFunction = this.prepass.getSpiderFunction(func);
        this._expression = this.spiderFunction.body;
        this._locals = new Map();
        this._localsUnreturnedCount = 0;
    }

    public emitInstructions(instrs: IR1Instruction[]): void {
        console.log(instrs.length);
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

    public emitExpression(emitter: ((emitter: WasmEmitter) => void) | IR1Instruction[]): SpiderExpression {
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
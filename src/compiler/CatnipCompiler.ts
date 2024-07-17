import { CatnipProject } from "../runtime/CatnipProject";
import { CatnipScript } from "../runtime/CatnipScript";
import { CatnipProjectModule } from "./CatnipProjectModule";
import { createLogger } from "../log";
import { CatnipIrCommandOp, CatnipIrCommandOpType, CatnipIrInputOp, CatnipIrInputOpType, CatnipIrOp, CatnipIrOpBranches } from "../ir/CatnipIrOp";
import { CatnipCommandList, CatnipCommandOp, CatnipInputOp, CatnipOpInputs } from "../ir/CatnipOp";
import { CatnipInputFlags, CatnipInputFormat } from "../ir/types";
import { ir_nop } from "../ir/ops/core/nop";
import { CatnipCompilerWasmGenContext } from "./CatnipCompilerWasmGenContext";

/*

Compiler Stages:

Stage 1: Generate
    -> All the operations are converted to their IR counterpart
    -> The IR is split up into functions and linked together

Stage 2: Analyse
    -> Each section is analysed to get type information

Stage 3: Emit
    -> Each section is converted into WASM

*/

export class CatnipCompilerIrGenContext {
    private static readonly _logger = createLogger("CatnipCompilerIrGenContext");
    public readonly compiler: CatnipCompiler;

    private _prev: CatnipIrOp | null;
    private _head: CatnipIrOp | null;
    private _isBranch: boolean;

    public constructor(compiler: CatnipCompiler) {
        this.compiler = compiler;
        this._prev = null;
        this._head = null;
        this._isBranch = false;
    }

    private _emitIr<TOp extends CatnipIrOp>(op: TOp): TOp {
        if (this._prev !== null) {
            op.prev.push(this._prev);
            CatnipCompilerIrGenContext._logger.assert(this._prev.branches.next === undefined);
            this._prev.branches.next = op;
        } else if (this._head === null) {
            this._head = op;
        }

        for (const branchName in op.branches) {
            op.branches[branchName].prev.push(op);
        }

        this._prev = op;
        return op;
    }

    public emitIrCommand<TInputs extends CatnipOpInputs, TBranches extends CatnipIrOpBranches>(op: CatnipIrCommandOpType<TInputs, TBranches>, inputs: TInputs, branches: TBranches): CatnipIrCommandOp<TInputs, TBranches> {
        return this._emitIr<CatnipIrCommandOp<TInputs, TBranches>>({ type: op, inputs, branches, prev: [] });
    }

    public emitIrInput<TInputs extends CatnipOpInputs, TBranches extends CatnipIrOpBranches>(op: CatnipIrInputOpType<TInputs, TBranches>, inputs: TInputs, format: CatnipInputFormat, flags: CatnipInputFlags, branches: TBranches): CatnipIrInputOp<TInputs, TBranches> {
        return this._emitIr<CatnipIrInputOp<TInputs, TBranches>>({ type: op, inputs, format, flags, branches, prev: [] });
    }

    public emitInput<TInputs extends CatnipOpInputs>(op: CatnipInputOp<TInputs>, format: CatnipInputFormat, flags: CatnipInputFlags) {
        op.type.generateIr(this, op.inputs, format, flags);
    }

    public emitCommand<TInputs extends CatnipOpInputs>(op: CatnipCommandOp<TInputs>) {
        op.type.generateIr(this, op.inputs);
    }

    public emitBranch(commands: CatnipCommandList): CatnipIrOp {
        const oldPrev = this._prev;
        const oldHead = this._head;

        this._prev = null;
        this._head = null;

        for (const command of commands) {
            this.emitCommand(command);
        }

        let newHead: CatnipIrOp | null = this._head;

        if (newHead === null) {
            newHead = { type: ir_nop, inputs: {}, prev: [], branches: {} };
        }

        this._prev = oldPrev;
        this._head = oldHead;

        return newHead;
    }

}


// /** @internal */
export class CatnipCompiler {

    public readonly project: CatnipProject;
    public readonly module: CatnipProjectModule;

    public get spiderModule() { return this.module.spiderModule; }

    constructor(project: CatnipProject) {
        this.project = project;
        this.module = new CatnipProjectModule(this.project.runtimeModule);
    }

    public compile(script: CatnipScript) {
        const irGenCtx = new CatnipCompilerIrGenContext(this);

        const irHead = irGenCtx.emitBranch(script.commands);

        const wasmFunc = this.spiderModule.createFunction();

        const wasmGenCtx = new CatnipCompilerWasmGenContext(this, wasmFunc.body);
        wasmGenCtx.emitBranch(irHead);

        this.spiderModule.exportFunction("testFunction", wasmFunc);
    }


}
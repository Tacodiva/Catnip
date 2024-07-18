import { CatnipProject } from "../runtime/CatnipProject";
import { CatnipScript } from "../runtime/CatnipScript";
import { CatnipProjectModule } from "./CatnipProjectModule";
import { CatnipCompilerWasmGenContext } from "./CatnipCompilerWasmGenContext";
import { CatnipCompilerIrGenContext } from "./CatnipCompilerIrGenContext";
import { CatnipIrFunction } from "./CatnipIrFunction";
import { CatnipIrCallType, CatnipIrOp } from "../ir/CatnipIrOp";

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

        const irBranch = irGenCtx.emitBranch(script.commands);

        // this._analyzeIrCalltype(irBranch.head);
        console.log(irBranch);
        console.log(irGenCtx.functions);

        for (const func of irGenCtx.functions) {
            const wasmGenCtx = new CatnipCompilerWasmGenContext(func);
            wasmGenCtx.emitBranch(func.head);
        }

        this.spiderModule.exportFunction("testFunction", irBranch.head.func.spiderFunction);
    }

    private _analyzeIrCalltype(irHead: CatnipIrOp) {
        let op: CatnipIrOp | undefined = irHead;

        while (op != null) {
            if (op.callType !== undefined) return;

            if (op.prev.length <= 1) {
                op.callType = CatnipIrCallType.Inline;
            } else {
                for (const caller of op.prev) {
                    if (caller.func !== op.func) {
                        op.callType = CatnipIrCallType.Function;
                        break;
                    }

                    if (caller.callType !== undefined) {
                        // We've already analyzed the caller, meaning it's before us in this function
                        if (op.callType === CatnipIrCallType.Loop) {
                            // This means we've also called this caller afterwards... we probably need to make a new function here
                            throw new Error("not implemented");
                        }

                        op.callType = CatnipIrCallType.Block;
                    } else {
                        // We've haven't analyzed the caller, meaning it's after us in this function
                        if (op.callType === CatnipIrCallType.Block) {
                            // Same as above
                            console.log(op);
                            throw new Error("not implemented");
                        }
                        op.callType = CatnipIrCallType.Loop;
                    }
                }
            }

            // Analyze the branches
            for (const branchName in op.branches) {
                if (branchName === "next") continue;
                this._analyzeIrCalltype(op.branches[branchName]);
            }

            // We analyze the "next" branch in this function to avoid a stack overflow
            op = op.branches.next;
        }
    }


}
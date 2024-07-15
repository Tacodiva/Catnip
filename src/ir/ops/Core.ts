import { SpiderNumberType } from "wasm-spider";
import { CatnipCompilerIrGenContext } from "../../compiler/CatnipCompiler";
import { CatnipCompilerWasmGenContext } from "../../compiler/CatnipCompilerWasmGenContext";
import { CatnipCommandOpIr, CatnipCommandOpType, CatnipInputOp, CatnipInputOpIr, CatnipInputOpType, CatnipOpInputs, CatnipOpType } from "../CatnipOp";
import { CatnipInputFlags, CatnipInputFormat } from "../types";

export const Core = {

    core_const: new class extends CatnipInputOpType<{ value: string }, { value: string }> {
        readonly opcode: "core_const";

        constructor() {
            super();
            this.opcode = "core_const";
        }

        public generateIr(ctx: CatnipCompilerIrGenContext, inputs: { value: string; }, format: CatnipInputFormat, flags: CatnipInputFlags): void {
            ctx.emitInputIr(this, inputs, format, flags);
        }

        public generateWasm(ctx: CatnipCompilerWasmGenContext, ir: CatnipInputOpIr<{ value: string }>): void {
            const stringPtr = ctx.alloateHeapString(ir.inputs.value);
            ctx.emitConstant(SpiderNumberType.i32, stringPtr);
        }
    },

    core_dbg_log: new class extends CatnipCommandOpType<{ message: CatnipInputOp }, {}> {
        readonly opcode: "core_dbg_log";

        constructor() {
            super();
            this.opcode = "core_dbg_log";
        }

        public generateIr(ctx: CatnipCompilerIrGenContext, inputs: { message: CatnipInputOp; }): void {
            ctx.emitInput(inputs.message, CatnipInputFormat.HSTRING_PTR, CatnipInputFlags.ANY);
            ctx.emitCommandIr(this, {});
        }

        public generateWasm(ctx: CatnipCompilerWasmGenContext, ir: CatnipCommandOpIr<{}>): void {
            ctx.emitRuntimeFunctionCall("catnip_blockutil_debug_log");
        }
    },


};

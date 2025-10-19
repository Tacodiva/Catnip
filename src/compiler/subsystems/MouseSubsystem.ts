import { SpiderNumberType, SpiderOpcodes } from "wasm-spider";
import { CatnipCompiler } from "../CatnipCompiler";
import { CatnipCompilerModuleSubsystem } from "../CatnipCompilerModuleSubsystem";
import { CatnipCompilerWasmModule } from "../wasm/CatnipCompilerWasmModule";

export class MouseSubsystem extends CatnipCompilerModuleSubsystem {

    public constructor(module: CatnipCompilerWasmModule) {
        super(module);
    }

    public preModuleWrite(): void {

        const mouseMovedFunction = this.spiderModule.createFunction({
            parameters: [SpiderNumberType.f64, SpiderNumberType.f64] // x, y
        });

        mouseMovedFunction.body.emitConstant(SpiderNumberType.i32, this.compiler.runtimeInstance.ptr);
        mouseMovedFunction.body.emit(SpiderOpcodes.local_get, mouseMovedFunction.getParameter(0));
        mouseMovedFunction.body.emit(SpiderOpcodes.local_get, mouseMovedFunction.getParameter(1));
        mouseMovedFunction.body.emit(SpiderOpcodes.call, this.module.getRuntimeFunction("catnip_io_mouse_move"));

        this.module.addEventListener("IO_MOUSE_MOVE", mouseMovedFunction);

        ///////

        const mouseDownFunction = this.spiderModule.createFunction();

        mouseDownFunction.body.emitConstant(SpiderNumberType.i32, this.compiler.runtimeInstance.ptr);
        mouseDownFunction.body.emit(SpiderOpcodes.call, this.module.getRuntimeFunction("catnip_io_mouse_down"));

        this.module.addEventListener("IO_MOUSE_DOWN", mouseDownFunction);

        ///////

        const mouseUpFunction = this.spiderModule.createFunction();

        mouseUpFunction.body.emitConstant(SpiderNumberType.i32, this.compiler.runtimeInstance.ptr);
        mouseUpFunction.body.emit(SpiderOpcodes.call, this.module.getRuntimeFunction("catnip_io_mouse_up"));

        this.module.addEventListener("IO_MOUSE_UP", mouseUpFunction);

    }
}
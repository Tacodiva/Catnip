import { SpiderNumberType, SpiderOpcodes } from "wasm-spider";
import { CatnipCompiler } from "../CatnipCompiler";
import { CatnipCompilerModuleSubsystem } from "../CatnipCompilerSubsystem";
import { CatnipCompilerWasmModule } from "../wasm/CatnipCompilerWasmModule";


export class KeyDownSubsystem extends CatnipCompilerModuleSubsystem {

    public constructor(module: CatnipCompilerWasmModule) {
        super(module);
    }

    public preModuleWrite(): void {
        
        const keyPressedFunction = this.spiderModule.createFunction({
            parameters: [SpiderNumberType.i32] // Key code
        });

        keyPressedFunction.body.emitConstant(SpiderNumberType.i32, this.compiler.runtimeInstance.ptr);
        keyPressedFunction.body.emit(SpiderOpcodes.local_get, keyPressedFunction.getParameter(0));
        keyPressedFunction.body.emit(SpiderOpcodes.call, this.module.getRuntimeFunction("catnip_io_key_pressed"));

        this.module.addEventListener("IO_KEY_PRESSED", keyPressedFunction);

        ////

        const keyReleasedFunction = this.spiderModule.createFunction({
            parameters: [SpiderNumberType.i32] // Key code
        });

        keyReleasedFunction.body.emitConstant(SpiderNumberType.i32, this.compiler.runtimeInstance.ptr);
        keyReleasedFunction.body.emit(SpiderOpcodes.local_get, keyReleasedFunction.getParameter(0));
        keyReleasedFunction.body.emit(SpiderOpcodes.call, this.module.getRuntimeFunction("catnip_io_key_released"));

        this.module.addEventListener("IO_KEY_RELEASED", keyReleasedFunction);
    }
}
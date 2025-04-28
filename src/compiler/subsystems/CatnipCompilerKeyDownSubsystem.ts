import { SpiderNumberType, SpiderOpcodes } from "wasm-spider";
import { CatnipCompiler } from "../CatnipCompiler";
import { CatnipCompilerSubsystem } from "../CatnipCompilerSubsystem";


export class CatnipCompilerKeyDownSubsystem extends CatnipCompilerSubsystem {

    public constructor(compiler: CatnipCompiler) {
        super(compiler);
    }

    public addEvents(): void {
        
        const keyPressedFunction = this.spiderModule.createFunction({
            parameters: [SpiderNumberType.i32] // Key code
        });

        keyPressedFunction.body.emitConstant(SpiderNumberType.i32, this.compiler.runtimeInstance.ptr);
        keyPressedFunction.body.emit(SpiderOpcodes.local_get, keyPressedFunction.getParameter(0));
        keyPressedFunction.body.emit(SpiderOpcodes.call, this.compiler.getRuntimeFunction("catnip_io_key_pressed"));

        this.compiler.addEventListener("IO_KEY_PRESSED", keyPressedFunction);

        ////

        const keyReleasedFunction = this.spiderModule.createFunction({
            parameters: [SpiderNumberType.i32] // Key code
        });

        keyReleasedFunction.body.emitConstant(SpiderNumberType.i32, this.compiler.runtimeInstance.ptr);
        keyReleasedFunction.body.emit(SpiderOpcodes.local_get, keyReleasedFunction.getParameter(0));
        keyReleasedFunction.body.emit(SpiderOpcodes.call, this.compiler.getRuntimeFunction("catnip_io_key_released"));

        this.compiler.addEventListener("IO_KEY_RELEASED", keyReleasedFunction);
    }
}
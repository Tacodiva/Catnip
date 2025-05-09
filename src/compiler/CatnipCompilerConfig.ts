
export interface CatnipCompilerConfig {
    enable_binaryen_optimizer?: boolean,
    binaryen_dump?: false | "wat" | "as" | "stack",
    ir_dump?: boolean;
    wasm_dump?: boolean;
    enable_tail_call?: boolean;
    enable_optimization_variable_inlining?: boolean;
    /** Slows execution down, but useful for testing variable inlining */
    enable_optimization_variable_inlining_force?: boolean;
    enable_optimization_type_analysis?: boolean;

    enable_warp_timer?: boolean;
}

export function catnipCreateDefaultCompilerConfig(): CatnipCompilerConfig {
    let def = {
        enable_binaryen_optimizer: true,
        binaryen_dump: false,
        ir_dump: false,
        wasm_dump: false,
        enable_tail_call: true,
        enable_optimization_variable_inlining: true,
        enable_optimization_variable_inlining_force: false,
        enable_optimization_type_analysis: true,
        enable_warp_timer: false,
    } as CatnipCompilerConfig;

    def.enable_binaryen_optimizer = false;
    // def.binaryen_dump = "stack";
    // def.ir_dump = true;
    def.enable_optimization_variable_inlining = false;
    // def.enable_optimization_type_analysis = false;
    // def.wasm_dump = true;

    return def;
}
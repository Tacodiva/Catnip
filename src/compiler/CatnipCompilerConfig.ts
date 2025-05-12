
export interface CatnipCompilerConfig {
    dump_binaryen?: false | "wat" | "as" | "stack";
    dump_ir?: boolean;
    dump_wasm_blob?: boolean;
    enable_tail_call?: boolean;
    enable_optimization_binaryen?: boolean;
    enable_optimization_variable_inlining?: boolean;
    /** Slows execution down, but useful for testing variable inlining */
    enable_optimization_variable_inlining_force?: boolean;
    enable_optimization_type_analysis?: boolean;

    enable_warp_timer?: boolean;
}

export function catnipCreateDefaultCompilerConfig(): CatnipCompilerConfig {
    let def = {
        dump_binaryen: false,
        dump_ir: false,
        dump_wasm_blob: false,
        enable_tail_call: true,
        enable_optimization_binaryen: true,
        enable_optimization_variable_inlining: true,
        enable_optimization_variable_inlining_force: false,
        enable_optimization_type_analysis: true,
        enable_warp_timer: false,
    } as CatnipCompilerConfig;

    // def.binaryen_dump = "stack";
    // def.ir_dump = true;
    // def.enable_optimization_binaryen = false;
    def.enable_optimization_variable_inlining = false;
    // def.enable_optimization_type_analysis = false;
    // def.wasm_dump = true;

    return def;
}
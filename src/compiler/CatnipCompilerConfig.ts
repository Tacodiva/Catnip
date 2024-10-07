
export interface CatnipCompilerConfig {
    enable_tail_call?: boolean;
    enable_optimization_variable_inlining?: boolean;
    /** Slows execution down, but useful for testing variable inlining */
    enable_optimization_variable_inlining_force?: boolean;
    enable_optimization_type_analysis?: boolean;
}

export function catnipCreateDefaultCompilerConfig(): CatnipCompilerConfig {
    return {
        enable_tail_call: true,
        enable_optimization_variable_inlining: true,
        enable_optimization_variable_inlining_force: false,
        enable_optimization_type_analysis: true,
    }
}
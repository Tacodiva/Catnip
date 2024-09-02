
export interface CatnipCompilerConfig {
    enable_tail_call?: boolean;
    enable_optimization_variable_inlining?: boolean;
    /** Slows execution down, but useful for testing variable inlining */
    enable_optimization_variable_inlining_force?: boolean;
}

export function catnipCreateDefaultCompilerConfig(): CatnipCompilerConfig {
    return {
        enable_tail_call: true,
        enable_optimization_variable_inlining: true,
        enable_optimization_variable_inlining_force: false
    }
}
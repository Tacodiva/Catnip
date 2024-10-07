
export enum CatnipCompilerStage {
    IR_GEN,
    PASS_PRE_ANALYSIS,
    PASS_ANALYSIS,
    PASS_POST_ANALYSIS,
    PASS_PRE_WASM_GEN,
    WASM_GEN,
}

export type CatnipCompilerPassStage = 
    CatnipCompilerStage.PASS_PRE_ANALYSIS |
    CatnipCompilerStage.PASS_ANALYSIS |
    CatnipCompilerStage.PASS_POST_ANALYSIS |
    CatnipCompilerStage.PASS_PRE_WASM_GEN;
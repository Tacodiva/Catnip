
export enum CatnipCompilerStage {
    IR_GEN,
    PASS_PRE_ANALYSIS_LOOP,
    PASS_ANALYSIS_LOOP,
    PASS_POST_ANALYSIS_LOOP,
    PASS_PRE_WASM_GEN,
    WASM_GEN,
}

export type CatnipCompilerPassStage = 
    CatnipCompilerStage.PASS_PRE_ANALYSIS_LOOP |
    CatnipCompilerStage.PASS_ANALYSIS_LOOP |
    CatnipCompilerStage.PASS_POST_ANALYSIS_LOOP |
    CatnipCompilerStage.PASS_PRE_WASM_GEN;
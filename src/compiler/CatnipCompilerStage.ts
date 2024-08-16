
export enum CatnipCompilerStage {
    IR_GENERATION,
    PASS_PRE_ANALYSIS_LOOP,
    PASS_ANALYSIS_LOOP,
    PASS_POST_ANALYSIS_LOOP,
    WASM_GENERATION,
}

export type CatnipCompilerPassStage = 
    CatnipCompilerStage.PASS_PRE_ANALYSIS_LOOP |
    CatnipCompilerStage.PASS_ANALYSIS_LOOP |
    CatnipCompilerStage.PASS_POST_ANALYSIS_LOOP;
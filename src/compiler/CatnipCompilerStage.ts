
export enum CatnipCompilerStage {
    IR_CREATION,
    IR_PRE_ANLYSIS,
    IR_GEN,
    PASS_PRE_ANALYSIS,
    PASS_ANALYSIS,
    PASS_POST_ANALYSIS,
    PASS_PRE_WASM_GEN,
    IR_WASM_GEN,
    EVENT_WASM_GEN,
    MODULE_CREATION,
}

export type CatnipCompilerPassStage = 
    CatnipCompilerStage.PASS_PRE_ANALYSIS |
    CatnipCompilerStage.PASS_ANALYSIS |
    CatnipCompilerStage.PASS_POST_ANALYSIS |
    CatnipCompilerStage.PASS_PRE_WASM_GEN;
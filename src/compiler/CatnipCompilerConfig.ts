import { CatnipEventID } from "../CatnipEvents";

export interface CatnipCompilerConfig {
    dump_binaryen: false | "wat" | "as" | "stack";
    dump_ir0: false | "basic" | "advanced";
    dump_ir1: boolean;
    dump_wasm_blob: boolean;
    enable_compiler_timing: boolean;
    enable_tail_call: boolean;

    enable_optimization_binaryen: boolean | number;
    enable_optimization_constant_folding: boolean;
    enable_optimization_graph_reduction: boolean;

    enable_warp_timer: boolean;

    events: Partial<Record<CatnipEventID, Partial<CatnipCompilerEventConfig>>>;
}

export interface CatnipCompilerEventConfig {
    enable_js_listeners: boolean;
    raw_listeners: Function[];
}

export function catnipCompilerConfigCreateDefault(): CatnipCompilerConfig {
    let def: CatnipCompilerConfig = {
        dump_binaryen: false,
        dump_ir0: false,
        dump_ir1: false,
        dump_wasm_blob: false,
        enable_compiler_timing: false,
        enable_tail_call: true,
        
        enable_optimization_binaryen: true,
        enable_optimization_constant_folding: true,
        enable_optimization_graph_reduction: true,

        enable_warp_timer: false,

        events: {}
    };

    return def;
}

export function catnipCompilerConfigPoppulate(partialConfig?: Partial<CatnipCompilerConfig>) : CatnipCompilerConfig {
    const config = catnipCompilerConfigCreateDefault();

    if (partialConfig === undefined) return config;

    Object.assign(config, partialConfig);

    return config;
}
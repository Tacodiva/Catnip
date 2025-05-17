
export interface CatnipRuntimeModuleRenderImports {
    
}

export interface CatnipRuntimeModuleImports {

    catnip: {
        catnip_import_log: (strPtr: number, strLength: number) => void;
        catnip_import_render_pen_draw_lines: (linesPtr: number, linesLength: number) => void;
        catnip_import_get_canon_string: (strPtr: number, strLength: number) => number;
        catnip_import_time: () => bigint,
    },

    env: {
        memory: WebAssembly.Memory,
        __indirect_function_table: WebAssembly.Table
    }

}

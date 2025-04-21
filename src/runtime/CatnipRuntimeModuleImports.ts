
export interface CatnipRuntimeModuleRenderImports {
    
}

export interface CatnipRuntimeModuleImports {

    catnip: {
        catnip_import_log: (strPtr: number, strLength: number) => void;
        catnip_import_render_pen_draw_lines: (linesPtr: number, linesLength: number) => void;
    },

    env: {
        memory: WebAssembly.Memory,
        __indirect_function_table: WebAssembly.Table
    }

}

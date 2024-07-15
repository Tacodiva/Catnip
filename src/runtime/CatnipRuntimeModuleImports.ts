
export interface CatnipRuntimeModuleImports {

    catnip: {
        catnip_import_log: (strPtr: number, strLength: number) => void;
    },

    env: {
        memory: WebAssembly.Memory,
        __indirect_function_table: WebAssembly.Table
    }

}

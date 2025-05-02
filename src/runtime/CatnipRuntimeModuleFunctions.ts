
import { SpiderNumberType, SpiderValueType } from 'wasm-spider';

export interface CatnipRuntimeModuleFunction<TResult extends SpiderValueType | undefined, TArgs extends SpiderValueType[]> {
    result: TResult,
    args: TArgs
}

function fn<TArgs extends SpiderValueType[], TResult extends SpiderValueType | undefined = undefined>(args: TArgs, result: TResult): CatnipRuntimeModuleFunction<TResult, TArgs> {
    return { args, result };
}

export const CatnipRuntimeModuleFunctions = {
    catnip_init: fn<[]>([], undefined),
    
    catnip_mem_alloc: fn<[length: SpiderNumberType.i32, zero: SpiderNumberType.i32], SpiderNumberType.i32>
        ([SpiderNumberType.i32, SpiderNumberType.i32], SpiderNumberType.i32),
    catnip_mem_free: fn<[ptr: SpiderNumberType.i32], undefined>
        ([SpiderNumberType.i32], undefined),

    catnip_numconv_stringify_f64: fn<[val: SpiderNumberType.f64, runtime: SpiderNumberType.i32], SpiderNumberType.i32>
        ([SpiderNumberType.f64, SpiderNumberType.i32], SpiderNumberType.i32),
    catnip_numconv_parse: fn<[str: SpiderNumberType.i32, runtime: SpiderNumberType.i32], SpiderNumberType.f64>
        ([SpiderNumberType.i32, SpiderNumberType.i32], SpiderNumberType.f64),

    catnip_runtime_new: fn<[], SpiderNumberType.i32>
        ([], SpiderNumberType.i32),
    catnip_runtime_tick: fn<[runtime: SpiderNumberType.i32], undefined>
        ([SpiderNumberType.i32], undefined),
    catnip_runtime_start_threads: fn<[
        runtime: SpiderNumberType.i32,
        sprite: SpiderNumberType.i32,
        entrypoint: SpiderNumberType.i32,
        threadList: SpiderNumberType.i32
    ], undefined>([SpiderNumberType.i32, SpiderNumberType.i32, SpiderNumberType.i32, SpiderNumberType.i32], undefined),
    catnip_runtime_render_pen_flush: fn<[runtime: SpiderNumberType.i32]>([SpiderNumberType.i32], undefined),
    catnip_runtime_new_hstring: fn<[runtime: SpiderNumberType.i32, length: SpiderNumberType.i32], SpiderNumberType.i32>
        ([SpiderNumberType.i32, SpiderNumberType.i32], SpiderNumberType.i32),

    catnip_target_new: fn<[runtime: SpiderNumberType.i32, sprite: SpiderNumberType.i32], SpiderNumberType.i32>
        ([SpiderNumberType.i32, SpiderNumberType.i32], SpiderNumberType.i32),
    catnip_target_start_new_thread: fn<[target: SpiderNumberType.i32, entrypoint: SpiderNumberType.i32, threadList: SpiderNumberType.i32], undefined>
        ([SpiderNumberType.i32, SpiderNumberType.i32, SpiderNumberType.i32], undefined),
    catnip_target_set_xy: fn<[x: SpiderNumberType.i32, y: SpiderNumberType.i32, target: SpiderNumberType.i32]>
        ([SpiderNumberType.i32, SpiderNumberType.i32, SpiderNumberType.i32], undefined),

    catnip_thread_new: fn<[target: SpiderNumberType.i32, fnprt: SpiderNumberType.i32], SpiderNumberType.i32>
        ([SpiderNumberType.i32, SpiderNumberType.i32], SpiderNumberType.i32),
    catnip_thread_yield: fn<[thread: SpiderNumberType.i32, fnprt: SpiderNumberType.i32], undefined>
        ([SpiderNumberType.i32, SpiderNumberType.i32], undefined),
    catnip_thread_terminate: fn<[thread: SpiderNumberType.i32], undefined>
        ([SpiderNumberType.i32], undefined),
    catnip_thread_resize_stack: fn<[thread: SpiderNumberType.i32, extraCapacity: SpiderNumberType.i32], undefined>
        ([SpiderNumberType.i32, SpiderNumberType.i32], undefined),

    catnip_blockutil_debug_log: fn<[SpiderNumberType.i32]>([SpiderNumberType.i32], undefined),
    catnip_blockutil_debug_log_int: fn<[SpiderNumberType.i32]>([SpiderNumberType.i32], undefined),
    catnip_blockutil_wait_for_threads: fn<[SpiderNumberType.i32], SpiderNumberType.i32>
        ([SpiderNumberType.i32], SpiderNumberType.i32),
    catnip_blockutil_hstring_cmp: fn<[SpiderNumberType.i32, SpiderNumberType.i32], SpiderNumberType.i32>
        ([SpiderNumberType.i32, SpiderNumberType.i32], SpiderNumberType.i32),
    catnip_blockutil_value_cmp: fn<[SpiderNumberType.f64, SpiderNumberType.f64, runtime: SpiderNumberType.i32], SpiderNumberType.i32>
        ([SpiderNumberType.f64, SpiderNumberType.f64, SpiderNumberType.i32], SpiderNumberType.i32),
    catnip_blockutil_value_eq: fn<[SpiderNumberType.f64, SpiderNumberType.f64, runtime: SpiderNumberType.i32], SpiderNumberType.i32>
        ([SpiderNumberType.f64, SpiderNumberType.f64, SpiderNumberType.i32], SpiderNumberType.i32),
    catnip_blockutil_hstring_join: fn<[SpiderNumberType.i32, SpiderNumberType.i32, runtime: SpiderNumberType.i32], SpiderNumberType.i32>
        ([SpiderNumberType.i32, SpiderNumberType.i32, SpiderNumberType.i32], SpiderNumberType.i32),
    catnip_blockutil_hstring_length: fn<[str: SpiderNumberType.i32], SpiderNumberType.i32>([SpiderNumberType.i32], SpiderNumberType.i32),
    catnip_blockutil_hstring_char_at: fn<[str: SpiderNumberType.i32, idx: SpiderNumberType.i32, runtime: SpiderNumberType.i32], SpiderNumberType.i32>
        ([SpiderNumberType.i32, SpiderNumberType.i32, SpiderNumberType.i32], SpiderNumberType.i32),
    catnip_blockutil_hstring_to_argb: fn<[str: SpiderNumberType.i32], SpiderNumberType.i32>
        ([SpiderNumberType.i32], SpiderNumberType.i32),
    catnip_blockutil_pen_update_thsv: fn<[target: SpiderNumberType.i32]>([SpiderNumberType.i32], undefined),
    catnip_blockutil_pen_update_argb: fn<[target: SpiderNumberType.i32]>([SpiderNumberType.i32], undefined),
    catnip_blockutil_pen_down: fn<[target: SpiderNumberType.i32]>([SpiderNumberType.i32], undefined),
    catnip_blockutil_list_push: fn<[item: SpiderNumberType.f64, list: SpiderNumberType.i32]>
        ([SpiderNumberType.f64, SpiderNumberType.i32], undefined),
    catnip_blockutil_list_delete_at: fn<[index: SpiderNumberType.i32, list: SpiderNumberType.i32]>
        ([SpiderNumberType.i32, SpiderNumberType.i32], undefined),
    catnip_blockutil_list_insert_at: fn<[index: SpiderNumberType.i32, value: SpiderNumberType.f64, list: SpiderNumberType.i32]>
        ([SpiderNumberType.i32, SpiderNumberType.f64, SpiderNumberType.i32], undefined),
    catnip_blockutil_costume_set: fn<[costumeString: SpiderNumberType.i32, target: SpiderNumberType.i32]>
        ([SpiderNumberType.i32, SpiderNumberType.i32], undefined),

    catnip_list_new: fn<[itemSize: SpiderNumberType.i32, capacity: SpiderNumberType.i32], SpiderNumberType.i32>
        ([SpiderNumberType.i32, SpiderNumberType.i32], SpiderNumberType.i32),

    catnip_math_fmod: fn<[a: SpiderNumberType.f64, b: SpiderNumberType.f64], SpiderNumberType.f64>
        ([SpiderNumberType.f64, SpiderNumberType.f64], SpiderNumberType.f64),

    catnip_io_key_pressed: fn<[rt: SpiderNumberType.i32, keyCode: SpiderNumberType.i32]>
        ([SpiderNumberType.i32, SpiderNumberType.i32], undefined),
    catnip_io_key_released: fn<[rt: SpiderNumberType.i32, keyCode: SpiderNumberType.i32]>
        ([SpiderNumberType.i32, SpiderNumberType.i32], undefined),
    catnip_io_mouse_move: fn<[rt: SpiderNumberType.i32, x: SpiderNumberType.f64, y: SpiderNumberType.f64]>
        ([SpiderNumberType.i32, SpiderNumberType.f64, SpiderNumberType.f64], undefined),
    catnip_io_mouse_down: fn<[rt: SpiderNumberType.i32]>([SpiderNumberType.i32], undefined),
    catnip_io_mouse_up: fn<[rt: SpiderNumberType.i32]>([SpiderNumberType.i32], undefined),
};

export type CatnipRuntimeModuleFunctionName = keyof typeof CatnipRuntimeModuleFunctions;

type MapSpiderTypeArray<T> = {
    [Key in keyof T]: MapSpiderType<T[Key]>
};

type MapSpiderType<T> =
    T extends typeof SpiderNumberType.f32 ? number :
    T extends typeof SpiderNumberType.f64 ? number :
    T extends typeof SpiderNumberType.i32 ? number :
    T extends typeof SpiderNumberType.i64 ? number :
    undefined extends T ? void :
    never;

export type CatnipRuntimeModuleFunctionExport<
    TModuleFn extends CatnipRuntimeModuleFunction<any, any>
> = (...args: TModuleFn extends CatnipRuntimeModuleFunction<any, infer TArgs> ? MapSpiderTypeArray<TArgs> : never) =>
        TModuleFn extends CatnipRuntimeModuleFunction<infer TResult, any> ? MapSpiderType<TResult> : never;

export type CatnipRuntimeModuleFunctionsObject = {
    [Key in keyof typeof CatnipRuntimeModuleFunctions]: CatnipRuntimeModuleFunctionExport<typeof CatnipRuntimeModuleFunctions[Key]>;
}

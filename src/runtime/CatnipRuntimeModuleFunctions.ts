
import { SpiderNumberType, SpiderValueType } from 'wasm-spider';

export interface CatnipRuntimeModuleFunction<TResult extends SpiderValueType | undefined, TArgs extends SpiderValueType[]> {
    result: TResult,
    args: TArgs
}

function fn<TArgs extends SpiderValueType[], TResult extends SpiderValueType | undefined = undefined>(args: TArgs, result: TResult): CatnipRuntimeModuleFunction<TResult, TArgs> {
    return { args, result };
}

export const CatnipRuntimeModuleFunctions = {
    catnip_mem_alloc: fn<[length: SpiderNumberType.i32, zero: SpiderNumberType.i32], SpiderNumberType.i32>
        ([SpiderNumberType.i32, SpiderNumberType.i32], SpiderNumberType.i32),

    catnip_mem_free: fn<[ptr: SpiderNumberType.i32], undefined>
        ([SpiderNumberType.i32], undefined),

    catnip_hstring_deref: fn<[ptr: SpiderNumberType.i32], undefined>
        ([SpiderNumberType.i32], undefined),

    catnip_runtime_new: fn<[], SpiderNumberType.i32>
        ([], SpiderNumberType.i32),

    main: fn<[ptr: SpiderNumberType.i32], undefined>
        ([SpiderNumberType.i32], undefined),

    catnip_blockutil_debug_log: fn<[SpiderNumberType.i32], undefined>
        ([SpiderNumberType.i32], undefined),
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


import { CatnipRuntimeModuleImports } from "./CatnipRuntimeModuleImports";
import { CatnipWasmStructRuntime } from "../wasm-interop/CatnipWasmStructRuntime";
import { WasmStruct, WasmStructWrapper, WasmUnionWrapper } from "../wasm-interop/wasm-types";
import { createLogger } from "../log";
import { CATNIP_STRING_HEADER_MAGIC, CatnipWasmStructHeapString } from "../wasm-interop/CatnipWasmStructHeapString";
import { CatnipWasmUnionValue, VALUE_CANNON_NAN_UPPER, VALUE_STRING_UPPER } from "../wasm-interop/CatnipWasmStructValue";
import { CatnipProject, CatnipProjectDesc } from "./CatnipProject";
import { CatnipWasmArrayFuncEntry } from "../wasm-interop/CatnipWasmStructFuncEntry";
import { CatnipRuntimeModuleFunctions, CatnipRuntimeModuleFunctionsObject } from "./CatnipRuntimeModuleFunctions";
import { ICatnipRenderer, PEN_ATTRIBUTE_STRIDE_BYTES } from "./ICatnipRenderer";
import UTF16 from "../utf16";
import { CatnipCompilerLogger } from "../compiler/CatnipCompilerLogger";

/*
 * A wrapper for the catnip wasm runtime
 */

export class CatnipRuntimeModule {

    public static async create(module: WebAssembly.Module, renderer: ICatnipRenderer): Promise<CatnipRuntimeModule> {
        let runtimeModule: CatnipRuntimeModule;

        const imports: CatnipRuntimeModuleImports = {
            catnip: {
                catnip_import_log: (strPtr: number, strLength: number) => {
                    const str = UTF16.decode(runtimeModule.memory.buffer.slice(strPtr, strPtr + (strLength * 2)));
                    CatnipRuntimeModule._wasmLogger.log(str);
                },
                catnip_import_render_pen_draw_lines: (linesPtr: number, linesLength: number) => {
                    renderer.penDrawLines(new Float32Array(runtimeModule.memory.buffer.slice(linesPtr, linesPtr + linesLength * PEN_ATTRIBUTE_STRIDE_BYTES)), linesLength);
                },
                catnip_import_get_canon_string: (strPtr: number, strLength: number) => {
                    let str: string;
                    if (strLength === 0) str = ""; 
                    else str = UTF16.decode(runtimeModule.memory.buffer.slice(strPtr, strPtr + (strLength * 2)));
                    return runtimeModule.createCanonHString(str);
                }
            },

            env: {
                memory: new WebAssembly.Memory({
                    initial: 4
                }),
                __indirect_function_table: new WebAssembly.Table({
                    element: "anyfunc",
                    initial: 8,
                }),
            }
        };

        runtimeModule = new CatnipRuntimeModule(module, imports, await WebAssembly.instantiate(module, imports as any), renderer);
        runtimeModule._init();
        return runtimeModule;
    }

    private static readonly _logger = createLogger("CatnipRuntime");
    private static readonly _wasmLogger = createLogger("CatnipRuntimeWASM");

    public readonly renderer: ICatnipRenderer;
    public readonly module: WebAssembly.Module;
    public readonly instance: WebAssembly.Instance;
    public readonly imports: CatnipRuntimeModuleImports;
    public readonly functions: CatnipRuntimeModuleFunctionsObject;

    private _memory: DataView | null;
    public get memory(): DataView {
        if (this._memory === null || this._memory.buffer !== this.imports.env.memory.buffer)
            this._memory = new DataView(this.imports.env.memory.buffer);
        return this._memory;
    }

    private _memoryBytes: Uint8Array | null;
    public get memoryBytes(): Uint8Array {
        if (this._memoryBytes === null || this._memoryBytes.buffer !== this.imports.env.memory.buffer)
            this._memoryBytes = new Uint8Array(this.imports.env.memory.buffer);
        return this._memoryBytes;
    }

    public get indirectFunctionTable() { return this.imports.env.__indirect_function_table; }

    private _canonStrings: Map<string, number>;

    /** @internal */
    public constructor(module: WebAssembly.Module, imports: CatnipRuntimeModuleImports, instance: WebAssembly.Instance, renderer: ICatnipRenderer) {
        this.module = module;
        this.instance = instance;
        this.imports = imports;

        // Validate the exports :3
        const missingExports = new Set(Object.keys(CatnipRuntimeModuleFunctions));

        for (const exportName in this.instance.exports) {
            if (!missingExports.delete(exportName))
                CatnipCompilerLogger.warn(`Unknown module export '${exportName}'.`);
        }

        for (const missingExport of missingExports) {
            CatnipCompilerLogger.error(`Missing module export '${missingExport}'.`);
        }

        this.functions = this.instance.exports as CatnipRuntimeModuleFunctionsObject;
        this._memory = null;
        this._memoryBytes = null;
        this.renderer = renderer;
        this._canonStrings = new Map();
    }

    private _init(): void {
        this.functions.catnip_init();
    }

    public loadProject(projectDesc: CatnipProjectDesc) {
        return new CatnipProject(this, projectDesc);
    }

    public allocateMemory(length: number, zero: boolean = true): number {
        return this.functions.catnip_mem_alloc(length, zero ? 1 : 0);
    }

    public freeMemory(ptr: number): void {
        this.functions.catnip_mem_free(ptr);
    }

    /** Creates an hstring which will never be garbage collected. */
    public createCanonHString(str: string): number {

        let strPtr = this._canonStrings.get(str);

        if (strPtr !== undefined) return strPtr;

        const encodedStr = UTF16.encode(str);

        strPtr = this.allocateMemory(encodedStr.length + CatnipWasmStructHeapString.size, false);

        CatnipWasmStructHeapString.set(strPtr, this.memory, {
            refcount: 0,
            bytelen: encodedStr.length + CatnipWasmStructHeapString.size,
            magic: CATNIP_STRING_HEADER_MAGIC,
            externref_count: 1,
            move_ptr: strPtr
        });

        this.memoryBytes.set(encodedStr, strPtr + CatnipWasmStructHeapString.size);

        this._canonStrings.set(str, strPtr);

        return strPtr;
    }

    /** Creates a new garbage collectable string associated with the given runtime. */
    public createNewString(runtime: WasmStructWrapper<typeof CatnipWasmStructRuntime>, str: string): number {
        const encodedStr = UTF16.encode(str);
        const hstringPtr = this.functions.catnip_runtime_new_hstring(runtime.ptr, encodedStr.length);

        this.memoryBytes.set(encodedStr, hstringPtr + CatnipWasmStructHeapString.size);
        return hstringPtr;
    }

    public createRuntimeInstance(): WasmStructWrapper<typeof CatnipWasmStructRuntime> {
        return new WasmStructWrapper(this.functions.catnip_runtime_new(), () => this.memory, CatnipWasmStructRuntime);
    }

    public allocateStruct<T extends WasmStruct<any>>(struct: T, zero: boolean = true): WasmStructWrapper<T> {
        return new WasmStructWrapper(this.allocateMemory(struct.size, zero), () => this.memory, struct);
    }

    public setValue(ptr: WasmUnionWrapper<typeof CatnipWasmUnionValue>, value: number | string) {
        if (typeof value === "number") {
            if (Number.isNaN(value)) {
                // TODO This is probably not necessary
                ptr.set({
                    index: 1,
                    value: {
                        upper: VALUE_CANNON_NAN_UPPER,
                        lower: 0
                    }
                });
            } else {
                ptr.set({
                    index: 0,
                    value
                });
            }
        } else {
            ptr.set({
                index: 1,
                value: {
                    upper: VALUE_STRING_UPPER,
                    lower: this.createCanonHString(value)
                }
            });
        }
    }
};
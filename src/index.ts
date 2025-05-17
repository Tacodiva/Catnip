import { CatnipRuntimeModule } from "./runtime/CatnipRuntimeModule";
import JSZip from "jszip";
import { readSB3 } from "./sb3_reader";
import { ICatnipRenderer } from "./runtime/ICatnipRenderer";
import { DummyRenderer } from "./runtime/DummyRenderer";
import { CatnipProject } from "./runtime/CatnipProject";


export async function run(runtimeModule: WebAssembly.Module, file: ArrayBuffer, renderer?: ICatnipRenderer): Promise<CatnipProject> {

    const jszip = new JSZip();

    const myzip = await jszip.loadAsync(file);

    const projectJSON = await myzip.file("project.json")!.async("string");

    const projectDesc = readSB3(JSON.parse(projectJSON), {
        allow_unknown_opcodes: true
    });

    const runtime = await CatnipRuntimeModule.create(runtimeModule, renderer ?? new DummyRenderer());

    return runtime.loadProject(projectDesc);
}
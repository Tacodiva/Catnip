
import { run } from "../src/index";
import { CatnipRenderer } from "../renderer";

async function main() {
    const moduleRequest = await fetch('catnip.wasm');
    // const sb3File = await (await fetch('Project.sb3')).arrayBuffer();
    const sb3File = await (await fetch('Mandlebrot Set Benchmark.sb3')).arrayBuffer();
    const module = await WebAssembly.compileStreaming(moduleRequest);

    run(module, sb3File, new CatnipRenderer());
}

globalThis.main = main;

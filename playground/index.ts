
import { run } from "../src/index";

async function main() {
    const moduleRequest = await fetch('catnip.wasm');
    const sb3File = await (await fetch('Project.sb3')).arrayBuffer();
    const module = await WebAssembly.compileStreaming(moduleRequest);

    run(module, sb3File);
}

main();
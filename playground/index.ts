
import { run } from "../src/index";

async function main() {
    const moduleRequest = await fetch('catnip.wasm');
    const module = await WebAssembly.compileStreaming(moduleRequest);

    run(module);
}

main();
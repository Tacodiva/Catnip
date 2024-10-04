
import { run } from "../src/index";
import fs from "node:fs/promises";

async function main() {
    const wasmFile = await fs.readFile("public/catnip.wasm");
    const module = await WebAssembly.compile(wasmFile);

    const projectFile = await fs.readFile("public/Mandlebrot Set Benchmark.sb3");

    run(module, projectFile);
}

main();
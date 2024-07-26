
import { run } from "../src/index";
import fs from "node:fs/promises";

async function main() {
    const file = await fs.readFile("public/catnip.wasm");
    const module = await WebAssembly.compile(file);

    run(module);
}

main();
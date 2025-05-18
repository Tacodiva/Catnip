
import { run } from "./src/index";
import fs from "node:fs/promises";

async function main() {

    const catnipWasmFile = await fs.readFile("public/catnip.wasm");
    const catnipModule = await WebAssembly.compile(catnipWasmFile);


    // const projectFile = await fs.readFile("public/Memory Corruption.sb3");
    // const projectFile = await fs.readFile("public/lines.sb3");
    // const projectFile = await fs.readFile("public/Mandlebrot Set Benchmark.sb3");
    // const projectFile = await fs.readFile("public/Project.sb3");
    // const projectFile = await fs.readFile("public/Variable inlining bug.sb3");
    // const projectFile = await fs.readFile("public/Conway.sb3");    
    // const projectFile = await fs.readFile("public/fib.sb3");
    const projectFile = await fs.readFile("public/LOS.sb3");

    const project = await run(catnipModule, projectFile);
    const projectModule = await project.compile({
        enable_optimization_binaryen: false,
        // dump_binaryen: "stack",
        enable_optimization_variable_inlining_force: true,
        // dump_ir: true

    });

    projectModule.start();

    do {
        projectModule.step();
    } while (projectModule.hasRunningThreads());
    
    // console.log("Garbage collection stats: ")
    // console.log(projectModule.getGcStats());
}

main();

import { run } from "./src/index";
import fs from "node:fs/promises";

async function main() {

    const catnipWasmFile = await fs.readFile("public/catnip.wasm");
    const catnipModule = await WebAssembly.compile(catnipWasmFile as BufferSource);


    // const projectFile = await fs.readFile("public/Memory Corruption.sb3");
    // const projectFile = await fs.readFile("public/lines.sb3");
    // const projectFile = await fs.readFile("public/Mandlebrot Set Benchmark.sb3");
    const projectFile = await fs.readFile("public/Project.sb3");
    // const projectFile = await fs.readFile("public/Variable inlining bug.sb3");
    // const projectFile = await fs.readFile("public/Conway.sb3");    
    // const projectFile = await fs.readFile("public/fib.sb3");
    // const projectFile = await fs.readFile("public/LOS.sb3");

    const project = await run(catnipModule, projectFile);
    const projectModule = await project.compile({
        enable_optimization_binaryen: false,
        // dump_binaryen: "stack",
        // dump_ir0: "advanced",
        // dump_ir1: true,
        enable_compiler_timing: true,
        enable_warp_timer: false,
    });

    projectModule.start();

    do {
        projectModule.step();
    } while (projectModule.hasRunningThreads());
    
    // console.log("Garbage collection stats: ")
    // console.log(projectModule.getGcStats());
}

main();
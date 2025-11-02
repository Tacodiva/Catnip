
import { run } from "./src/index";
import fs from "node:fs/promises";

async function main() {

    const catnipWasmFile = await fs.readFile("public/catnip.wasm");
    const catnipModule = await WebAssembly.compile(catnipWasmFile as BufferSource);


    const projectFile = await fs.readFile("public/Project.sb3");
    // const projectFile = await fs.readFile("public/Memory Corruption.sb3");
    // const projectFile = await fs.readFile("public/lines.sb3");
    // const projectFile = await fs.readFile("public/Mandlebrot Set Benchmark.sb3");
    // const projectFile = await fs.readFile("public/Variable inlining bug.sb3");
    // const projectFile = await fs.readFile("public/Conway.sb3");    
    // const projectFile = await fs.readFile("public/fib.sb3");
    // const projectFile = await fs.readFile("public/LOS2.sb3");

    const project = await run(catnipModule, projectFile);
    const projectModule = await project.compile({
        // dump_ir0: "advanced",
        // dump_ir0: "advanced",
        dump_ir1: true,
        // dump_binaryen: "stack",
        // enable_compiler_timing: true,
        // dump_wasm_blob: "los.wasm",
        
        enable_optimization_binaryen: false,
        enable_optimization_constant_folding: false,
        // enable_optimization_graph_reduction: false,
        // enable_optimization_dead_script_elimination: false,
        enable_optimization_procedure_inlinling: false,
        // enable_optimization_dead_branch_elimination: false,
        enable_optimization_variable_analysis: false,

        // events: {
        //     PROJECT_BROADCAST: {
        //         enable_js_listeners: true
        //     }
        // }
    });

    // projectModule.addEventListener("PROJECT_BROADCAST", (name) => {
    //     console.log(`Received broadcast '${name}'`)
    // })

    projectModule.start();

    projectModule.step();
    do {
        console.log("Yield.");
        projectModule.step();
    } while (projectModule.hasRunningThreads());

    // console.log("Garbage collection stats: ")
    // console.log(projectModule.getGcStats());
}

main();

import { run } from "./src/index";
import fs from "node:fs/promises";

async function main() {

    const catnipWasmFile = await fs.readFile("public/catnip.wasm");
    const catnipModule = await WebAssembly.compile(catnipWasmFile);


    const projectFile = await fs.readFile("public/Memory Corruption.sb3");
    // const projectFile = await fs.readFile("public/lines.sb3");
    // const projectFile = await fs.readFile("public/Mandlebrot Set Benchmark.sb3");
    // const projectFile = await fs.readFile("public/Project.sb3");
    // const projectFile = await fs.readFile("public/Conway.sb3");    
    // const projectFile = await fs.readFile("public/fib.sb3");

    const project = await run(catnipModule, projectFile);
            
    do {
        project.step();
    } while (project.runtimeInstance.getMember("num_active_threads") !== 0);
    
    // console.log("Garbage collection stats: ")
    // console.log(project.runtimeInstance.getMemberWrapper("gc_stats").getInnerWrapper().get());

    // console.log(project.getSprite("1").defaultTarget.structWrapper.get());

}

main();
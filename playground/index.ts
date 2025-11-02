
import { run } from "../src/index";
import { CatnipRenderer } from "../renderer";

async function main() {
    const moduleRequest = await fetch('catnip.wasm');
    // const sb3File = await (await fetch('Project.sb3')).arrayBuffer();
    // const sb3File = await (await fetch('Variable inlining bug.sb3')).arrayBuffer();
    // const sb3File = await (await fetch('Conway.sb3')).arrayBuffer();
    // const sb3File = await (await fetch('Mandlebrot Set Benchmark.sb3')).arrayBuffer();
    // const sb3File = await (await fetch('lines.sb3')).arrayBuffer();
    // const sb3File = await (await fetch('fib.sb3')).arrayBuffer();
    const sb3File = await (await fetch('LOS.sb3')).arrayBuffer();
    // const sb3File = await (await fetch('psx.sb3')).arrayBuffer();
    // const sb3File = await (await fetch('NES.sb3')).arrayBuffer();
    const module = await WebAssembly.compileStreaming(moduleRequest);

    const renderer = new CatnipRenderer();

    const project = await run(module, new Uint8Array(sb3File), renderer);
    const projectModule = await project.compile({
        dump_wasm_blob: false,
        enable_compiler_timing: true,

        // enable_optimization_binaryen: false,
        // enable_optimization_constant_folding: false,
        // enable_optimization_graph_reduction: false,
        // enable_optimization_dead_script_elimination: false,
        // enable_optimization_procedure_inlinling: false,
        // enable_optimization_dead_branch_elimination: false,
        // enable_optimization_variable_analysis: false
    });

    document.addEventListener("keydown", (event) => {
        projectModule.triggerEvent("IO_KEY_PRESSED", event.keyCode);
    });

    document.addEventListener("keyup", (event) => {
        projectModule.triggerEvent("IO_KEY_RELEASED", event.keyCode);
    });

    document.addEventListener("mousemove", (event) => {
        const canvasElement = renderer.canvasElement;
        const rect = canvasElement.getBoundingClientRect();

        const mouseX = (event.clientX - rect.left) / canvasElement.width;
        const mouseY = (event.clientY - rect.top) / canvasElement.height;

        const centeredX = mouseX - 0.5;
        const centeredY = mouseY - 0.5;

        projectModule.triggerEvent("IO_MOUSE_MOVE", centeredX * 480, -centeredY * 360);
    });

    document.addEventListener("mouseup", (event) => {
        projectModule.triggerEvent("IO_MOUSE_UP");
    });

    document.addEventListener("mousedown", (event) => {
        projectModule.triggerEvent("IO_MOUSE_DOWN");
    });

    const greenFlag = document.createElement("button");
    greenFlag.innerText = "Green Flag";
    greenFlag.onclick = () => {
        projectModule.start();
    };
    document.body.appendChild(greenFlag);

    (window as any).project = projectModule;

    let intervalToken: any;

    const stepRate = 30;

    function frame() {

        try {
            projectModule.step();
            projectModule.frame();
        } catch (e) {
            console.error("Error while stepping project.")
            console.error(e);
            clearInterval(intervalToken);
        }
    }

    intervalToken = setInterval(frame, 1000 / stepRate);
}

(globalThis as any).main = main;

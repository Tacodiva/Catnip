
import { run } from "../src/index";
import { CatnipRenderer } from "../renderer";

async function main() {
    const moduleRequest = await fetch('catnip.wasm');
    // const sb3File = await (await fetch('Project.sb3')).arrayBuffer();
    // const sb3File = await (await fetch('Conway.sb3')).arrayBuffer();
    // const sb3File = await (await fetch('Mandlebrot Set Benchmark.sb3')).arrayBuffer();
    // const sb3File = await (await fetch('lines.sb3')).arrayBuffer();
    const sb3File = await (await fetch('fib.sb3')).arrayBuffer();
    const module = await WebAssembly.compileStreaming(moduleRequest);

    const renderer = new CatnipRenderer();

    const project = await run(module, sb3File, renderer);

    document.addEventListener("keydown", (event) => {
        project.triggerEvent("IO_KEY_PRESSED", event.keyCode);
    });

    document.addEventListener("keyup", (event) => {
        project.triggerEvent("IO_KEY_RELEASED", event.keyCode);
    });

    document.addEventListener("mousemove", (event) => {
        const canvasElement = renderer.canvasElement;
        const rect = canvasElement.getBoundingClientRect();
    
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;
    
        const centeredX = mouseX - canvasElement.width / 2;
        const centeredY = mouseY - canvasElement.height / 2;
    
        project.triggerEvent("IO_MOUSE_MOVE", centeredX * 2, centeredY * -2);
    });

    document.addEventListener("mouseup", (event) => {
        project.triggerEvent("IO_MOUSE_UP");
    });
    
    document.addEventListener("mousedown", (event) => {
        project.triggerEvent("IO_MOUSE_DOWN");
    });

    const stepRate = 30;

    function frame() {

        project.step();

    }

    setInterval(frame, 1000 / stepRate);
}

globalThis.main = main;

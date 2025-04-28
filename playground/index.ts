
import { run } from "../src/index";
import { CatnipRenderer } from "../renderer";

async function main() {
    const moduleRequest = await fetch('catnip.wasm');
    const sb3File = await (await fetch('Project.sb3')).arrayBuffer();
    // const sb3File = await (await fetch('Mandlebrot Set Benchmark.sb3')).arrayBuffer();
    // const sb3File = await (await fetch('lines.sb3')).arrayBuffer();
    const module = await WebAssembly.compileStreaming(moduleRequest);

    const project = await run(module, sb3File, new CatnipRenderer());

    document.addEventListener("keydown", function onEvent(event) {
        project.triggerEvent("IO_KEY_PRESSED", event.keyCode);
    });

    document.addEventListener("keyup", function onEvent(event) {
        project.triggerEvent("IO_KEY_RELEASED", event.keyCode);
    });

    const stepRate = 30;

    function frame() {

        project.step();

    }

    setInterval(frame, 1000 / stepRate);
}

globalThis.main = main;

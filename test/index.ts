
import { run } from "../src/index";
import fs from "node:fs/promises";
import { registerSB3CommandBlock } from "../src/sb3_ops";
import { op_log } from "../src/ops/core/log";
import { op_const } from "../src/ops/core/const";
import { op_callback_command } from '../src/ops/core/callback_command';
import { CatnipValueFormat } from "../src/compiler/CatnipValueFormat";
import { test } from "tap"



async function main() {

    const catnipWasmFile = await fs.readFile("public/catnip.wasm");
    const catnipModule = await WebAssembly.compile(catnipWasmFile);

    for (const projectFileName of (await fs.readdir("test/execute"))) {

        if (projectFileName.endsWith(".sb2"))
            throw new Error("SB2 not supported.");

        if (!projectFileName.endsWith(".sb3"))
            continue;

        const projectFile = await fs.readFile("test/execute/" + projectFileName);

        test(`${projectFileName}`, async t => {

            let didPlan = false;
            let didEnd = false;

            registerSB3CommandBlock("looks_say", (ctx, block) =>
                op_callback_command.create({
                    name: "test_callback",
                    inputs: [[ctx.readInput(block.inputs.MESSAGE), CatnipValueFormat.I32_HSTRING]],
                    callback: (message) => {

                        const command = message.split(/\s+/, 1)[0].toLowerCase();
                        const arg = message.substring(command.length).trim();

                        switch (command) {
                            case "pass":
                                t.pass(arg);
                                break;
                            case "fail":
                                t.fail(arg);
                                break;
                            case "plan":
                                if (didPlan) {
                                    t.fail("Must plan only once.")
                                } else {
                                    didPlan = true;
                                    t.plan(Number(arg));
                                }
                                break;
                            case "end":
                                didEnd = true;
                                // ??
                                t.end();
                                break;
                            case "comment":
                                t.comment(message);
                                break;
                            default:
                                t.comment(message);
                                break;
                        }
                    }
                }
                ), true);

            await run(catnipModule, projectFile);

            if (!didEnd) {
                t.fail("Test did not end.");
                t.end();
                return;
            }
        });
    }

    // const wasmFile = await fs.readFile("public/catnip.wasm");
    // const module = await WebAssembly.compile(wasmFile);


    // // const projectFile = await fs.readFile("public/Memory Corruption.sb3");
    // const projectFile = await fs.readFile("public/Mandlebrot Set Benchmark.sb3");
    // // const projectFile = await fs.readFile("public/Project.sb3");

    // run(module, projectFile);
}

main();
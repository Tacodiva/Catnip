import { CatnipOps } from "./ir";
import { CatnipRuntimeModule } from "./runtime/CatnipRuntimeModule";


async function main() {

    const moduleRequest = await fetch('catnip.wasm');
    const module = await WebAssembly.compileStreaming(moduleRequest);

    const runtime = await CatnipRuntimeModule.create(module);
    const project = runtime.loadProject({
        sprites: [
            {
                id: "my_sprite",
                name: "My Sprite",
                variables: [
                    {
                        id: "my_var_A",
                        name: "my var A",
                        value: 10
                    },
                    {
                        id: "my_var_B",
                        name: "my var B",
                        value: "Hello, World!"
                    }
                ],
                scripts: [
                    {
                        id: "a",
                        commands: [
                            CatnipOps.control_if_else.create({
                                condition: CatnipOps.core_const.create({ value: 0 }),
                                true_branch: [
                                    CatnipOps.core_log.create({
                                        msg: CatnipOps.core_const.create({ value: "A" })
                                    }),
                                ],
                                false_branch: [
                                    CatnipOps.core_log.create({
                                        msg: CatnipOps.core_const.create({ value: "B" })
                                    }),
                                    CatnipOps.core_yield.create({}),
                                ]
                            }),
                            CatnipOps.core_log.create({
                                msg: CatnipOps.core_const.create({ value: "C" })
                            }),
                        ],
                        trigger: {
                            type: "event",
                            event: "greenflag"
                        }
                    }
                ]
            }
        ]
    });

    // const project = await runtime.initialize();

    await project.rewrite();

    runtime.functions.main(project.runtimeInstance.ptr);

}

main();

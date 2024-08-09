import { CatnipOps } from "./ir";
import { CatnipRuntimeModule } from "./runtime/CatnipRuntimeModule";


export async function run(runtimeModule: WebAssembly.Module) {

    const runtime = await CatnipRuntimeModule.create(runtimeModule);
    const project = runtime.loadProject({
        sprites: [
            {
                id: "sprite",
                name: "My Sprite",
                variables: [
                    {
                        id: "first",
                        name: "first",
                    },
                    {
                        id: "second",
                        name: "second",
                    },
                    {
                        id: "nth",
                        name: "nth",
                    }
                ],
                target: {
                    variables: [
                        { id: "first", value: 0 },
                        { id: "second", value: 1 },
                        { id: "nth", value: 1 },
                    ],

                    x_position: 0,
                    y_position: 0
                },
                scripts: [
                    {
                        id: "a",
                        // commands: [
                        //     CatnipOps.core_log.create({
                        //         msg: CatnipOps.core_const.create({ value: "A" })
                        //     }),
                        //     CatnipOps.control_if_else.create({
                        //         condition: CatnipOps.core_const.create({ value: 1 }),
                        //         true_branch: [
                        //             CatnipOps.core_yield.create({}),
                        //             CatnipOps.core_log.create({
                        //                 msg: CatnipOps.core_const.create({ value: "B" })
                        //             }),
                        //         ],
                        //         false_branch: [
                        //             CatnipOps.core_log.create({
                        //                 msg: CatnipOps.core_const.create({ value: "C" })
                        //             }),
                        //             CatnipOps.core_yield.create({}),
                        //             CatnipOps.core_log.create({
                        //                 msg: CatnipOps.core_const.create({ value: "D" })
                        //             }),
                        //             CatnipOps.core_yield.create({}),
                        //         ]
                        //     }),
                        //     CatnipOps.core_log.create({
                        //         msg: CatnipOps.core_const.create({ value: "E" })
                        //     }),
                        //     CatnipOps.core_yield.create({}),
                        //     CatnipOps.core_log.create({
                        //         msg: CatnipOps.core_const.create({ value: "F" })
                        //     }),
                        // ],
                        // commands: [
                        //     CatnipOps.core_log.create({
                        //         msg: CatnipOps.core_const.create({ value: "Outer!" })
                        //     }),
                        //     CatnipOps.control_forever.create({
                        //         loop: [
                        //             CatnipOps.core_log.create({
                        //                 msg: CatnipOps.core_const.create({ value: "Inner! " })
                        //             }),
                        //             CatnipOps.core_yield.create({}),
                        //         ]
                        //     })
                        // ],
                        // commands: [
                        //     CatnipOps.core_log.create({
                        //         msg: CatnipOps.core_const.create({ value: "Outer!" })
                        //     }),
                        //     CatnipOps.control_repeat.create({
                        //         count: CatnipOps.core_const.create({ value: 3 }),
                        //         loop: [
                        //             CatnipOps.core_yield.create({}),
                        //             CatnipOps.core_log.create({
                        //                 msg: CatnipOps.core_const.create({ value: "Inner! " })
                        //             }),
                        //             CatnipOps.control_repeat.create({
                        //                 count: CatnipOps.core_const.create({ value: 2 }),
                        //                 loop: [
                        //                     CatnipOps.core_log.create({
                        //                         msg: CatnipOps.core_const.create({ value: "Inner v2! " })
                        //                     }),
                        //                 ]
                        //             })
                        //         ]
                        //     }),
                        //     CatnipOps.core_log.create({
                        //         msg: CatnipOps.core_const.create({ value: "Done!" })
                        //     }),
                        // ],
                        commands: [
                            CatnipOps.control_repeat.create({
                                count: CatnipOps.core_const.create({ value: 100000 }),
                                loop: [
                                    CatnipOps.data_set_var.create({
                                        sprite: "sprite",
                                        variable: "first",
                                        value: CatnipOps.core_const.create({ value: 0 }),
                                    }),
                                    CatnipOps.data_set_var.create({
                                        sprite: "sprite",
                                        variable: "second",
                                        value: CatnipOps.core_const.create({ value: 1 }),
                                    }),
                                    CatnipOps.data_set_var.create({
                                        sprite: "sprite",
                                        variable: "nth",
                                        value: CatnipOps.core_const.create({ value: 1 }),
                                    }),
                                    CatnipOps.control_repeat.create({
                                        count: CatnipOps.core_const.create({ value: 1200 }),
                                        loop: [
                                            CatnipOps.data_set_var.create({
                                                sprite: "sprite",
                                                variable: "nth",
                                                value: CatnipOps.operators_add.create({
                                                    left: CatnipOps.data_get_var.create({
                                                        sprite: "sprite",
                                                        variable: "first",
                                                    }),
                                                    right: CatnipOps.data_get_var.create({
                                                        sprite: "sprite",
                                                        variable: "second",
                                                    }),
                                                }),
                                            }),
                                            CatnipOps.data_set_var.create({
                                                sprite: "sprite",
                                                variable: "first",
                                                value: CatnipOps.data_get_var.create({
                                                    sprite: "sprite",
                                                    variable: "second",
                                                }),
                                            }),
                                            CatnipOps.data_set_var.create({
                                                sprite: "sprite",
                                                variable: "second",
                                                value: CatnipOps.data_get_var.create({
                                                    sprite: "sprite",
                                                    variable: "nth",
                                                }),
                                            }),
                                        ]
                                    }),
                                ]
                            }),
                            CatnipOps.core_log.create({
                                msg: CatnipOps.data_get_var.create({
                                    sprite: "sprite",
                                    variable: "nth",
                                }),
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

}
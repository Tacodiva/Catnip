import { CatnipOps } from "./ops";
import { CatnipRuntimeModule } from "./runtime/CatnipRuntimeModule";
import JSZip from "jszip";
import { readSB3 } from "./sb3_reader";


export async function run(runtimeModule: WebAssembly.Module, file: ArrayBuffer) {

    const jszip = new JSZip();

    const myzip = await jszip.loadAsync(file);

    const projectJSON = await myzip.file("project.json")!.async("string");

    const projectDesc = readSB3(JSON.parse(projectJSON));


    const runtime = await CatnipRuntimeModule.create(runtimeModule);

    // const project = runtime.loadProject({
    //     sprites: [
    //         {
    //             id: "sprite",
    //             name: "My Sprite",
    //             variables: [
    //                 {
    //                     id: "first",
    //                     name: "first",
    //                 },
    //                 {
    //                     id: "second",
    //                     name: "second",
    //                 },
    //                 {
    //                     id: "nth",
    //                     name: "nth",
    //                 }
    //             ],
    //             target: {
    //                 variables: [
    //                     { id: "first", value: 0 },
    //                     { id: "second", value: 1 },
    //                     { id: "nth", value: 1 },
    //                 ],

    //                 x_position: 0,
    //                 y_position: 0
    //             },
    //             scripts: [
    //                 {
    //                     id: "a",
    //                     // commands: [
    //                     //     CatnipOps.core_log.create({
    //                     //         msg: CatnipOps.core_const.create({ value: "A" })
    //                     //     }),
    //                     //     CatnipOps.control_if_else.create({
    //                     //         condition: CatnipOps.core_const.create({ value: 0 }),
    //                     //         true_branch: [
    //                     //             CatnipOps.core_yield.create({}),
    //                     //             CatnipOps.core_log.create({
    //                     //                 msg: CatnipOps.core_const.create({ value: "B" })
    //                     //             }),
    //                     //         ],
    //                     //         false_branch: [
    //                     //             CatnipOps.core_log.create({
    //                     //                 msg: CatnipOps.core_const.create({ value: "C" })
    //                     //             }),
    //                     //             CatnipOps.core_yield.create({}),
    //                     //             CatnipOps.core_log.create({
    //                     //                 msg: CatnipOps.core_const.create({ value: "D" })
    //                     //             }),
    //                     //             CatnipOps.core_yield.create({}),
    //                     //         ]
    //                     //     }),
    //                     //     CatnipOps.core_log.create({
    //                     //         msg: CatnipOps.core_const.create({ value: "E" })
    //                     //     }),
    //                     //     CatnipOps.core_yield.create({}),
    //                     //     CatnipOps.core_log.create({
    //                     //         msg: CatnipOps.core_const.create({ value: "F" })
    //                     //     }),
    //                     // ],
    //                     // commands: [
    //                     //     CatnipOps.core_log.create({
    //                     //         msg: CatnipOps.core_const.create({ value: "Outer!" })
    //                     //     }),
    //                     //     CatnipOps.data_set_var.create({
    //                     //         sprite: "sprite",
    //                     //         variable: "nth",
    //                     //         value: CatnipOps.core_const.create({ value: 1 })
    //                     //     }),
    //                     //     CatnipOps.control_repeat.create({
    //                     //         count: CatnipOps.core_const.create({ value: 10 }),
    //                     //         loop: [
    //                     //             CatnipOps.control_if_else.create({
    //                     //                 condition: CatnipOps.core_const.create({ value: 1 }),
    //                     //                 true_branch: [
    //                     //                     CatnipOps.core_yield.create({}),
    //                     //                     CatnipOps.core_log.create({
    //                     //                         msg: CatnipOps.core_const.create({ value: "True" })
    //                     //                     }),
    //                     //                 ],
    //                     //                 false_branch: [
    //                     //                     CatnipOps.core_log.create({
    //                     //                         msg: CatnipOps.core_const.create({ value: "False" })
    //                     //                     }),
    //                     //                 ]

    //                     //             }),
    //                     //             CatnipOps.core_log.create({
    //                     //                 msg: CatnipOps.data_get_var.create({
    //                     //                     sprite: "sprite",
    //                     //                     variable: "nth",
    //                     //                 })
    //                     //             }),
    //                     //             CatnipOps.core_yield.create({}),
    //                     //             CatnipOps.data_set_var.create({
    //                     //                 sprite: "sprite",
    //                     //                 variable: "nth",
    //                     //                 value: CatnipOps.operators_add.create({
    //                     //                     left: CatnipOps.core_const.create({ value: 1 }),
    //                     //                     right: CatnipOps.data_get_var.create({
    //                     //                         sprite: "sprite",
    //                     //                         variable: "nth",
    //                     //                     })
    //                     //                 }),
    //                     //             }),

    //                     //         ]
    //                     //     })
    //                     // ],
    //                     // commands: [
    //                     //     CatnipOps.core_log.create({
    //                     //         msg: CatnipOps.core_const.create({ value: "Outer!" })
    //                     //     }),
    //                     //     CatnipOps.control_repeat.create({
    //                     //         count: CatnipOps.core_const.create({ value: 3 }),
    //                     //         loop: [
    //                     //             CatnipOps.core_yield.create({}),
    //                     //             CatnipOps.core_log.create({
    //                     //                 msg: CatnipOps.core_const.create({ value: "Inner! " })
    //                     //             }),
    //                     //             CatnipOps.control_repeat.create({
    //                     //                 count: CatnipOps.core_const.create({ value: 2 }),
    //                     //                 loop: [
    //                     //                     CatnipOps.core_yield.create({}),
    //                     //                     CatnipOps.core_log.create({
    //                     //                         msg: CatnipOps.core_const.create({ value: "Inner v2! " })
    //                     //                     }),
    //                     //                 ]
    //                     //             })
    //                     //         ]
    //                     //     }),
    //                     //     CatnipOps.core_log.create({
    //                     //         msg: CatnipOps.core_const.create({ value: "Done!" })
    //                     //     }),
    //                     // ],

    //                     // // Fib // // 
    //                     commands: [
    //                         CatnipOps.control_forever.create({
    //                             loop: [
    //                                 CatnipOps.control_repeat.create({
    //                                     count: CatnipOps.core_const.create({ value: 100000 }),
    //                                     loop: [
    //                                         CatnipOps.data_set_var.create({
    //                                             sprite: "sprite",
    //                                             variable: "first",
    //                                             value: CatnipOps.core_const.create({ value: 0 }),
    //                                         }),
    //                                         CatnipOps.data_set_var.create({
    //                                             sprite: "sprite",
    //                                             variable: "second",
    //                                             value: CatnipOps.core_const.create({ value: 1 }),
    //                                         }),
    //                                         CatnipOps.data_set_var.create({
    //                                             sprite: "sprite",
    //                                             variable: "nth",
    //                                             value: CatnipOps.core_const.create({ value: 1 }),
    //                                         }),
    //                                         CatnipOps.control_repeat.create({
    //                                             count: CatnipOps.core_const.create({ value: 1200 }),
    //                                             loop: [
    //                                                 CatnipOps.data_set_var.create({
    //                                                     sprite: "sprite",
    //                                                     variable: "nth",
    //                                                     value: CatnipOps.operators_add.create({
    //                                                         left: CatnipOps.data_get_var.create({
    //                                                             sprite: "sprite",
    //                                                             variable: "first",
    //                                                         }),
    //                                                         right: CatnipOps.data_get_var.create({
    //                                                             sprite: "sprite",
    //                                                             variable: "second",
    //                                                         }),
    //                                                     }),
    //                                                 }),
    //                                                 CatnipOps.data_set_var.create({
    //                                                     sprite: "sprite",
    //                                                     variable: "first",
    //                                                     value: CatnipOps.data_get_var.create({
    //                                                         sprite: "sprite",
    //                                                         variable: "second",
    //                                                     }),
    //                                                 }),
    //                                                 CatnipOps.data_set_var.create({
    //                                                     sprite: "sprite",
    //                                                     variable: "second",
    //                                                     value: CatnipOps.data_get_var.create({
    //                                                         sprite: "sprite",
    //                                                         variable: "nth",
    //                                                     }),
    //                                                 }),
    //                                             ]
    //                                         }),
    //                                     ]
    //                                 }),
    //                                 CatnipOps.core_log.create({
    //                                     msg: CatnipOps.data_get_var.create({
    //                                         sprite: "sprite",
    //                                         variable: "nth",
    //                                     }),
    //                                 }),
    //                                 CatnipOps.core_yield.create({})
    //                             ]
    //                         }),
    //                     ],

    //                     // commands: [
    //                     //     CatnipOps.control_if_else.create({
    //                     //         condition: CatnipOps.core_const.create({ value: 1 }),
    //                     //         true_branch: [
    //                     //             CatnipOps.data_set_var.create({
    //                     //                 sprite: "sprite",
    //                     //                 variable: "first",
    //                     //                 value: CatnipOps.core_const.create({ value: 7729 }),
    //                     //             }),
    //                     //         ]
    //                     //     }),
    //                     //     CatnipOps.core_log.create({
    //                     //         msg: CatnipOps.data_get_var.create({
    //                     //             sprite: "sprite",
    //                     //             variable: "first",
    //                     //         }),
    //                     //     }),
    //                     // ],

    //                     // commands: [
    //                     //     CatnipOps.core_log.create({
    //                     //         msg: CatnipOps.operators_add.create({
    //                     //             left: CatnipOps.core_const.create({ value: 1 }),
    //                     //             right: CatnipOps.core_const.create({ value: 2 }),
    //                     //         }),
    //                     //     }),
    //                     // ],

    //                     trigger: {
    //                         type: CatnipOps.event_when_flag_clicked_trigger,
    //                         inputs: {}
    //                     }
    //                 }
    //             ]
    //         }
    //     ]
    // });

    const project = runtime.loadProject(projectDesc);

    // const project = await runtime.initialize();

    await project.rewrite();

    // for (let tick = 1; tick <= 10; tick++) {
    //     console.time("C " + tick);
    //     runtime.functions.main(project.runtimeInstance.ptr);
    //     console.timeEnd("C " + tick);
    // }


}
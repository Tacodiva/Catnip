// import { CatnipCompilerPass } from "../CatnipCompilerPass";
// import { CatnipCompilerPassContext } from '../../CatnipCompilerPassContext';
// import { CatnipCompilerStage } from "../../CatnipCompilerStage";
// import { CatnipCompilerValueGraphSubsystem, ValueGraph, ValueGraphFuncInfo, ValueGraphVariableInfo } from "../../subsystems/CatnipCompilerValueGraphSubsystem";
// import { CatnipCompilerValue } from "../../CatnipCompilerValue";
// import { CatnipValueFormat } from "../../CatnipValueFormat";
// import { CatnipValueFormatUtils } from "../../CatnipValueFormatUtils";
// import { CatnipIrFunction } from "../../CatnipIrFunction";
// import { ir_procedure_trigger } from "../../ir/procedure/procedure_trigger";

// export const PassValueGraph: CatnipCompilerPass = {

//     stage: CatnipCompilerStage.PASS_ANALYSIS,

//     run(ctx: CatnipCompilerPassContext): void {

//         const subsystem = ctx.compiler.getSubsystem(CatnipCompilerValueGraphSubsystem);

//         const valueGraph: ValueGraph = {
//             functions: new Map(),
//             variables: new Map()
//         };

//         // A list of functions which can be yielded to. These functions need to 
//         //  be re-analyzed when we update global variable state.
//         const yieldFunctions: CatnipIrFunction[] = [];


//         // Setup the initial state of the project by setting all the variables to whatever they are now
//         for (const sprite of ctx.compiler.project.sprites) {
//             for (const variable of sprite.variables) {

//                 const value = sprite.defaultTarget.getVariableValue(variable.id);

//                 let format;

//                 if (typeof(value) === "string") {
//                     format = CatnipValueFormat.F64_BOXED_I32_HSTRING;
//                 } else {
//                     format = CatnipValueFormatUtils.getNumberFormat(value);
//                 }

//                 valueGraph.variables.set(variable, new ValueGraphVariableInfo(
//                     CatnipCompilerValue.constant(value, format),
//                     []
//                 ));
//             }
//         }

//         // Next, create the graph filled in with the bare minimum information

//         function getGraphFuncInfo(func: CatnipIrFunction): ValueGraphFuncInfo {
//             let funcInfo = valueGraph.functions.get(func);
//             if (funcInfo !== undefined) return funcInfo;

//             if (func.hasFunctionTableIndex) {
//                 yieldFunctions.push(func);
//             }

//             if (func.ir.trigger.type === ir_procedure_trigger)

//             funcInfo = {
//                 // entryArguments: [],
//                 // entryVariables: new Map()
//             }
//         }

//         // Creates the nodes for the accesses that happen inside this function
//         function createInternalFuncGraph(func: CatnipIrFunction) {

//         }


//     }
// }

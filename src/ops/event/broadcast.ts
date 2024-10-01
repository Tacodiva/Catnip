// import { CatnipCompilerIrGenContext } from "../../compiler/CatnipCompilerIrGenContext";
// import { CatnipEventID } from "../../runtime/CatnipScript";
// import { CatnipCommandOpType } from "../CatnipOp";

// type broadcast_inputs = { event: CatnipEventID };

// export const op_event_broadcast = new class extends CatnipCommandOpType<broadcast_inputs> {

//     public generateIr(ctx: CatnipCompilerIrGenContext, inputs: broadcast_inputs) {

//         ctx.emitIr(ir_get_var, { target, variable }, {});
//     }
// }
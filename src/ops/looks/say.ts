import { registerSB3CommandBlock } from "../../sb3_ops";
import { op_log } from "../core/log";

registerSB3CommandBlock("looks_say", (ctx, block) => 
    op_log.create({ msg: ctx.readInput(block.inputs.MESSAGE), type: "log" }
));
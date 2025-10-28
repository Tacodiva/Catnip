import { registerSB3InputBlock } from "../../sb3_ops";
import { op_const } from "../core/const";
import { op_get_costume } from "./get_costume";
import "./say";
import { op_switch_to_costume } from "./switch_to_costume";

registerSB3InputBlock("looks_costume", (ctx, block) =>
    op_const.create({
        value: block.fields.COSTUME[0]
    })
);

export default {
    looks_switch_to_costume: op_switch_to_costume,
    looks_get_costume: op_get_costume,
};
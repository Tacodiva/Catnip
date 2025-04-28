import { registerSB3InputBlock } from "../../sb3_ops";
import { op_const } from "../core/const";
import { op_days_since_2000 } from "./days_since_2000";
import { op_is_key_down } from "./is_key_down";

registerSB3InputBlock("sensing_keyoptions", (ctx, block) =>
    op_const.create({
        value: block.fields.KEY_OPTION[0]
    })
);

export default {
    sensing_days_since_2000: op_days_since_2000,
    sensing_is_key_pressed: op_is_key_down,
};
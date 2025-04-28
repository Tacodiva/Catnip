import { registerSB3InputBlock } from "../../sb3_ops";
import { op_const } from "../core/const";
import { op_days_since_2000 } from "./days_since_2000";
import { op_get_mouse_x } from "./get_mouse_x";
import { op_get_mouse_y } from "./get_mouse_y";
import { op_is_key_down } from "./is_key_down";
import { op_is_mouse_down } from "./is_mouse_down";

registerSB3InputBlock("sensing_keyoptions", (ctx, block) =>
    op_const.create({
        value: block.fields.KEY_OPTION[0]
    })
);

export default {
    sensing_days_since_2000: op_days_since_2000,
    sensing_is_key_pressed: op_is_key_down,
    sensing_get_mouse_x: op_get_mouse_x,
    sensing_get_mouse_y: op_get_mouse_y,
    sensing_is_mouse_down: op_is_mouse_down,
};
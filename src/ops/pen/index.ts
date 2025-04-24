import { registerSB3InputBlock } from "../../sb3_ops";
import { op_const } from "../core/const";
import { op_erase_all } from "./erase_all";
import { op_pen_change_param_by } from "./pen_change_param_by";
import { op_pen_down } from "./pen_down";
import { op_pen_set_color_to } from "./pen_set_color_to";
import { op_pen_set_size_to } from "./pen_set_size_to";
import { op_pen_up } from "./pen_up";

registerSB3InputBlock("pen_menu_colorParam", (ctx, block) =>
    op_const.create({
        value: block.fields.colorParam[0]
    })
);

export default {
    pen_erase_all: op_erase_all,
    pen_down: op_pen_down,
    pen_up: op_pen_up,
    pen_set_color_to: op_pen_set_color_to,
    pen_set_size_to: op_pen_set_size_to,
    pen_change_param_by: op_pen_change_param_by,
}
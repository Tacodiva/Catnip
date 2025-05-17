import { op_change_x } from "./change_x";
import { op_change_y } from "./change_y";
import { op_get_x } from "./get_x";
import { op_get_y } from "./get_y";
import { op_goto_xy } from "./goto_xy";
import { op_set_x } from "./set_x";
import { op_set_y } from "./set_y";

export default {
    motion_goto_xy: op_goto_xy,
    motion_set_x: op_set_x,
    motion_set_y: op_set_y,
    motion_get_x: op_get_x,
    motion_get_y: op_get_y,
    motion_change_x: op_change_x,
    motion_change_y: op_change_y,
};
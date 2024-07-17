import { op_const } from "./const";
import { op_log } from "./log";
import { op_nop } from "./nop";

export default {
    core_nop: op_nop,
    core_const: op_const,
    core_log: op_log,
};
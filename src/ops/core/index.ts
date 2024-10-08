import { op_barrier } from "./barrier";
import { op_const } from "./const";
import { op_log } from "./log";
import { op_nop } from "./nop";
import { op_thread_terminate } from "./thread_terminate";
import { op_yield } from './yield';

export default {
    core_nop: op_nop,
    core_const: op_const,
    core_log: op_log,
    core_yield: op_yield,
    core_thread_terminate: op_thread_terminate,
    core_barrier: op_barrier
};
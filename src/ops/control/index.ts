import { op_for_each } from "./for_each";
import { op_forever } from "./forever";
import { op_if_else } from "./if_else";
import { op_repeat } from './repeat';
import { op_repeat_until } from "./repeat_until";
import { op_stop } from "./stop";
import { op_wait } from "./wait";
import { op_while } from "./while";

export default {
    control_if_else: op_if_else,
    control_forever: op_forever,
    control_repeat: op_repeat,
    control_repeat_until: op_repeat_until,
    control_while: op_while,
    control_for_each: op_for_each,
    control_stop: op_stop,
    control_wait: op_wait,
}
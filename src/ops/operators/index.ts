
import { op_add } from "./add";
import { op_sub } from "./sub"
import { op_lt } from "./lt";
import { op_gt } from "./gt";
import { op_equals } from "./equals";
import { op_mul } from "./mul";
import { op_or } from "./or";
import { op_join } from "./join";
import { op_div } from "./div";
import { op_length } from "./length";
import { op_letter_of } from "./letter_of";
import { op_and } from "./and";
import { op_not } from "./not";
import { op_mathop } from "./mathop";
import { op_contains } from "./contains";
import { op_mod } from "./mod";
import { op_round } from "./round";
import { op_random } from "./random";

export default {
    operators_sub: op_sub,
    operators_add: op_add,
    operators_multiply: op_mul,
    operators_divide: op_div,
    operators_mod: op_mod,
    operators_round: op_round,
    operators_lt: op_lt,
    operators_gt: op_gt,
    operators_equals: op_equals,
    operators_or: op_or,
    operators_and: op_and,
    operators_not: op_not,
    operators_join: op_join,
    operators_length: op_length,
    operators_letter_or: op_letter_of,
    operators_contains: op_contains,
    operators_mathop: op_mathop,
    operators_random: op_random,
};
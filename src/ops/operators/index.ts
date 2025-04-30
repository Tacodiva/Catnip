
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

export default {
    operators_sub: op_sub,
    operators_add: op_add,
    operators_multiply: op_mul,
    operators_divide: op_div,
    operators_lt: op_lt,
    operators_gt: op_gt,
    operators_equals: op_equals,
    operators_or: op_or,
    operators_join: op_join,
    operators_length: op_length,
    operators_letter_or: op_letter_of,
};
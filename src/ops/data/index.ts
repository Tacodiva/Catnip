
import { op_change_var_by } from "./change_var_by";
import { op_get_var } from "./get_var";
import { op_set_var } from "./set_var";

export default {
    data_get_var: op_get_var,
    data_set_var: op_set_var,
    data_change_var_by: op_change_var_by,
};
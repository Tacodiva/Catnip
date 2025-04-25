
import { op_change_var_by } from "./change_var_by";
import { op_clear_list } from "./clear_list";
import { op_delete_list_item } from "./delete_list_item";
import { op_get_list_item } from "./get_list_item";
import { op_get_list_length } from "./get_list_length";
import { op_get_var } from "./get_var";
import { op_insert_list_item } from "./intert_list_item";
import { op_push_list_item } from "./push_list_item";
import { op_replace_list_item } from "./replace_list_item";
import { op_set_var } from "./set_var";

export default {
    data_get_var: op_get_var,
    data_set_var: op_set_var,
    data_change_var_by: op_change_var_by,
    data_get_list_item: op_get_list_item,
    data_push_list_item: op_push_list_item,
    data_get_list_length: op_get_list_length,
    data_clear_list: op_clear_list,
    data_replace_list_item: op_replace_list_item,
    data_insert_list_item: op_insert_list_item,
    data_delete_list_item: op_delete_list_item,
};

#ifndef CATNIP_BLOCKUTIL_H_INCLUDED
#define CATNIP_BLOCKUTIL_H_INCLUDED

#include "./catnip.h"

void catnip_blockutil_debug_log(catnip_hstring* str);
void catnip_blockutil_debug_log_int(catnip_ui32_t x);

catnip_thread_status catnip_blockutil_wait_for_threads(catnip_list *threadList);

catnip_i32_t catnip_blockutil_value_cmp(catnip_runtime *runtime, catnip_value a, catnip_value b);
catnip_bool_t catnip_blockutil_value_eq(catnip_runtime *runtime, catnip_value a, catnip_value b);

catnip_i32_t catnip_blockutil_hstring_cmp(const catnip_hstring *a, const catnip_hstring *b);
catnip_hstring *catnip_blockutil_hstring_join(catnip_runtime *runtime, const catnip_hstring *a, const catnip_hstring *b);
catnip_ui32_t catnip_blockutil_hstring_length(catnip_hstring *str);
catnip_hstring *catnip_blockutil_hstring_char_at(catnip_runtime *runtime, catnip_hstring *str, catnip_ui32_t index);
catnip_bool_t catnip_blockutil_hstring_contains(catnip_hstring *str, catnip_hstring *contains);
catnip_ui32_t catnip_blockutil_hstring_to_argb(const catnip_hstring *str);

void catnip_blockutil_pen_update_thsv(catnip_target *target);
void catnip_blockutil_pen_update_argb(catnip_target *target);
void catnip_blockutil_pen_down(catnip_target *target);

void catnip_blockutil_list_push(catnip_list *list, catnip_f64_t value);
void catnip_blockutil_list_delete_at(catnip_list *list, catnip_i32_t value);
void catnip_blockutil_list_insert_at(catnip_list *list, catnip_i32_t index, catnip_f64_t value);

void catnip_blockutil_costume_set(catnip_target *target, catnip_hstring *costume);

catnip_f64_t catnip_blockutil_operator_random(catnip_runtime *runtime, catnip_value a, catnip_value b);

#endif

#ifndef CATNIP_BLOCKUTIL_H_INCLUDED
#define CATNIP_BLOCKUTIL_H_INCLUDED

#include "./catnip.h"

void catnip_blockutil_debug_log(catnip_hstring* str);
catnip_thread_status catnip_blockutil_wait_for_threads(catnip_list *threadList);
catnip_i32_t catnip_blockutil_hstring_cmp(const catnip_hstring *a, const catnip_hstring *b);
catnip_i32_t catnip_blockutil_value_cmp(catnip_runtime *runtime, catnip_value a, catnip_value b);
catnip_bool_t catnip_blockutil_value_eq(catnip_runtime *runtime, catnip_value a, catnip_value b);
catnip_hstring *catnip_blockutil_hstring_join(catnip_runtime *runtime, const catnip_hstring *a, const catnip_hstring *b);

#endif
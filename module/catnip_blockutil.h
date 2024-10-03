
#ifndef CATNIP_BLOCKUTIL_H_INCLUDED
#define CATNIP_BLOCKUTIL_H_INCLUDED

#include "./catnip.h"

void catnip_blockutil_debug_log(catnip_hstring* str);
catnip_thread_status catnip_blockutil_wait_for_threads(catnip_list *threadList);
catnip_i32_t catnip_blockutil_strcmp(catnip_hstring *a, catnip_hstring *b);

#endif
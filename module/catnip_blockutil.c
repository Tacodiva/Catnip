
#include "./catnip.h"

void catnip_blockutil_debug_log(catnip_hstring *str) {
  catnip_hstring_print(str);
}

catnip_thread_status catnip_blockutil_wait_for_threads(catnip_list *threadList) {
  catnip_bool_t anyRunning = CATNIP_FALSE;

  for (catnip_ui32_t i = 0; i < CATNIP_LIST_LENGTH(threadList, catnip_thread *); i++) {
    catnip_thread *thread = CATNIP_LIST_GET(threadList, catnip_thread *, i);

    if (thread->status != CATNIP_THREAD_STATUS_TERMINATED) {
      anyRunning = CATNIP_TRUE;
      break;
    }
  }

  if (!anyRunning) {
    CATNIP_LIST_FREE(threadList, catnip_thread *);
    return CATNIP_THREAD_STATUS_RUNNING;
  }

  catnip_bool_t allWaiting = CATNIP_TRUE;

  for (catnip_ui32_t i = 0; i < CATNIP_LIST_LENGTH(threadList, catnip_thread *); i++) {
    catnip_thread *thread = CATNIP_LIST_GET(threadList, catnip_thread *, i);

    // TODO Add promise wait?
    if (thread->status != CATNIP_THREAD_STATUS_YIELD_TICK) {
      allWaiting = CATNIP_FALSE;
      break;
    }
  }

  if (allWaiting) {
    return CATNIP_THREAD_STATUS_YIELD_TICK;
  } else {
    return CATNIP_THREAD_STATUS_YIELD;
  }
}

catnip_i32_t catnip_blockutil_strcmp(catnip_hstring *a, catnip_hstring *b) {
  catnip_ui32_t prefixLen = a->bytelen <= b->bytelen ? a->bytelen : b->bytelen;

  catnip_i32_t rc = catnip_mem_cmp(catnip_hstring_get_data(a), catnip_hstring_get_data(b), prefixLen);

  if (rc < 0) {
    return -1;
  } else if (rc > 0) {
    return 1;
  }

  if (a->bytelen < b->bytelen) {
    return -1;
  } else if (a->bytelen > b->bytelen) {
    return 1;
  }

  return 0;
}
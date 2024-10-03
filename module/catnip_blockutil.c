
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

// https://github.com/TurboWarp/scratch-vm/blob/fed099c4ccb1ae59a8a7fe2ae14fa4ef4b85bd01/src/util/cast.js#L142
catnip_i32_t catnip_blockutil_value_cmp(catnip_value a, catnip_value b) {
  catnip_f64_t aNumber = catnip_value_to_number(a);
  catnip_f64_t bNumber = catnip_value_to_number(b);

  if (CATNIP_F64_ISNAN(aNumber) || CATNIP_F64_ISNAN(bNumber)) {
    catnip_hstring *aString = catnip_value_to_string(a);
    catnip_hstring *bString = catnip_value_to_string(b);

    catnip_i32_t result = catnip_blockutil_hstring_cmp(aString, bString);

    catnip_hstring_deref(aString);
    catnip_hstring_deref(bString);

    return result;
  }

  if (CATNIP_F64_ISINFINITE(aNumber) && CATNIP_F64_ISINFINITE(bNumber) &&
    CATNIP_F64_SIGNBIT(aNumber) == CATNIP_F64_SIGNBIT(bNumber)) {
      return 0;
  }

  return aNumber - bNumber;
}

catnip_bool_t catnip_blockutil_value_eq(catnip_value a, catnip_value b) {
  catnip_f64_t aNumber = catnip_value_to_number(a);
  catnip_f64_t bNumber = catnip_value_to_number(b);

  if (CATNIP_F64_ISNAN(aNumber) || CATNIP_F64_ISNAN(bNumber)) {
    catnip_hstring *aString = catnip_value_to_string(a);
    catnip_hstring *bString = catnip_value_to_string(b);

    catnip_i32_t result = catnip_blockutil_hstring_cmp(aString, bString);

    catnip_hstring_deref(aString);
    catnip_hstring_deref(bString);

    return result == 0;
  }

  return aNumber == bNumber;
}

catnip_i32_t catnip_blockutil_hstring_cmp(const catnip_hstring *a, const catnip_hstring *b) {

  const catnip_char_t *aStart = catnip_hstring_get_data(a);
  const catnip_char_t *aEnd = aStart + a->bytelen;
  const catnip_char_t *aCur = aStart;

  const catnip_char_t *bStart = catnip_hstring_get_data(b);
  const catnip_char_t *bEnd = bStart + b->bytelen;
  const catnip_char_t *bCur = bStart;

  for (;;) {
    if (aCur < aEnd) {
      if (bCur < bEnd) {
        catnip_codepoint_t aCodepoint = catnip_unicode_decode_utf8_checked(&aCur, aStart, aEnd);
        catnip_codepoint_t bCodepoint = catnip_unicode_decode_utf8_checked(&bCur, bStart, bEnd);

        aCodepoint = catnip_unicode_to_lowercase(aCodepoint);
        bCodepoint = catnip_unicode_to_lowercase(bCodepoint);

        if (aCodepoint < bCodepoint)
          return -1;

        if (aCodepoint > bCodepoint)
          return 1;

      } else {
        // String A is longer than string B
        return 1;
      }
    } else {
      if (bCur < bEnd) {
        // String B is longer than string A
        return -1;
      } else {
        // They're the same length
        return 0;
      }
    }
  }
}


#include "./catnip.h"

void catnip_blockutil_debug_log(catnip_hstring *str) {
  catnip_hstring_print(str);
}

void catnip_blockutil_debug_log_int(catnip_ui32_t x) {
  catnip_util_print_int(x);
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
catnip_i32_t catnip_blockutil_value_cmp(catnip_runtime *runtime, catnip_value a, catnip_value b) {
  catnip_f64_t aNumber = catnip_value_to_number(runtime, a);
  catnip_f64_t bNumber = catnip_value_to_number(runtime, b);

  if (CATNIP_F64_ISNAN(aNumber) || CATNIP_F64_ISNAN(bNumber)) {
    catnip_hstring *aString = catnip_value_to_string(runtime, a);
    catnip_hstring *bString = catnip_value_to_string(runtime, b);

    catnip_i32_t result = catnip_blockutil_hstring_cmp(aString, bString);

    return result;
  }

  if (CATNIP_F64_ISINFINITE(aNumber) && CATNIP_F64_ISINFINITE(bNumber) &&
    CATNIP_F64_SIGNBIT(aNumber) == CATNIP_F64_SIGNBIT(bNumber)) {
      return 0;
  }

  return aNumber - bNumber;
}

catnip_bool_t catnip_blockutil_value_eq(catnip_runtime *runtime, catnip_value a, catnip_value b) {
  catnip_f64_t aNumber = catnip_value_to_number(runtime, a);
  catnip_f64_t bNumber = catnip_value_to_number(runtime, b);

  if (CATNIP_F64_ISNAN(aNumber) || CATNIP_F64_ISNAN(bNumber)) {
    catnip_hstring *aString = catnip_value_to_string(runtime, a);
    catnip_hstring *bString = catnip_value_to_string(runtime, b);

    catnip_i32_t result = catnip_blockutil_hstring_cmp(aString, bString);

    return result == 0;
  }

  return aNumber == bNumber;
}

catnip_i32_t catnip_blockutil_hstring_cmp(const catnip_hstring *a, const catnip_hstring *b) {

  // Fast path if both pointers are equal
  if (a == b) return 0;

  const catnip_wchar_t *aStart = catnip_hstring_get_data(a);
  const catnip_wchar_t *aEnd = aStart + CATNIP_HSTRING_LENGTH(a);
  const catnip_wchar_t *aCur = aStart;

  const catnip_wchar_t *bStart = catnip_hstring_get_data(b);
  const catnip_wchar_t *bEnd = bStart + CATNIP_HSTRING_LENGTH(b);
  const catnip_wchar_t *bCur = bStart;

  for (;;) {
    if (aCur < aEnd) {
      if (bCur < bEnd) {
        catnip_codepoint_t aCodepoint = catnip_unicode_decode_utf16(&aCur, aEnd);
        catnip_codepoint_t bCodepoint = catnip_unicode_decode_utf16(&bCur, bEnd);

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

catnip_hstring *catnip_blockutil_hstring_join(catnip_runtime *runtime, const catnip_hstring *a, const catnip_hstring *b) {

  const catnip_ui32_t aLen = CATNIP_HSTRING_LENGTH(a);
  const catnip_ui32_t bLen = CATNIP_HSTRING_LENGTH(b);

  const catnip_ui32_t newLen = aLen + bLen;
  

  catnip_hstring *newStr = catnip_hstring_new_simple(runtime, newLen);

  catnip_wchar_t *newStrData = catnip_hstring_get_data(newStr);
  
  catnip_mem_copy(newStrData, catnip_hstring_get_data(a), aLen * sizeof(catnip_wchar_t));
  catnip_mem_copy(newStrData + aLen, catnip_hstring_get_data(b), bLen * sizeof(catnip_wchar_t));

  return newStr;
}

catnip_ui32_t catnip_blockutil_hstring_length(catnip_hstring *str) {
  return CATNIP_HSTRING_LENGTH(str);
}

catnip_hstring *catnip_blockutil_hstring_char_at(catnip_runtime *runtime, catnip_hstring *str, catnip_ui32_t index) {

  if (index >= CATNIP_HSTRING_LENGTH(str)) {
    // Index out of range
    return CATNIP_STRING_BLANK;
  }

  return catnip_hstring_new(runtime, &catnip_hstring_get_data(str)[index], 1);
}

inline catnip_i32_t to_hex_value(const catnip_wchar_t c) {
  if (c >= '0' && c <= '9') return c - '0';
  if (c >= 'A' && c <= 'F') return (c - 'A') + 10;
  if (c >= 'a' && c <= 'f') return (c - 'a') + 10;
  return -1;
}

catnip_ui32_t catnip_blockutil_hstring_to_argb(const catnip_hstring *str) {

  const catnip_wchar_t *strData = catnip_hstring_get_data(str);
  const catnip_ui32_t strLen = CATNIP_HSTRING_LENGTH(str);

  CATNIP_ASSERT(strData[0] == '#');

  if (strLen == 7) {
    // In the format '#RRGGBB'
    catnip_ui32_t color = 0;

    for (catnip_ui32_t i = 1; i < 7; i++) {
      catnip_i32_t value = to_hex_value(strData[i]);
      if (value == -1) return 0xFF << 24; // Default to alpha 255 if invalid hex

      color <<= 4;
      color |= value;
    }

    return color;
  }

  if (strLen == 4) {
    // In the format '#RGB'
    catnip_ui32_t color = 0;

    for (catnip_ui32_t i = 1; i < 4; i++) {
      catnip_i32_t value = to_hex_value(strData[i]);
      if (value == -1) return 0xFF << 24;

      color <<= 4;
      color |= value;
      color <<= 4;
      color |= value;
    }
  }

  return 0;
}

void catnip_blockutil_pen_update_thsv(catnip_target *target) {

  CATNIP_ASSERT(target->pen_argb_valid);
  CATNIP_ASSERT(!target->pen_thsv_valid);

  const catnip_f64_t a = ((target->pen_argb >> 24) & 0xFF) / 255.0;
  const catnip_f64_t r = ((target->pen_argb >> 16) & 0xFF) / 255.0;
  const catnip_f64_t g = ((target->pen_argb >> 8) & 0xFF) / 255.0;
  const catnip_f64_t b = ((target->pen_argb >> 0) & 0xFF) / 255.0;

  const catnip_f64_t x = CATNIP_MIN(CATNIP_MIN(r, g), b);
  const catnip_f64_t v = CATNIP_MAX(CATNIP_MAX(r, g), b);

  // For grays, hue will be arbitrarily reported as zero. Otherwise, calculate
  catnip_f64_t h = 0;
  catnip_f64_t s = 0;

  if (x != v) {
    const catnip_f64_t f = (r == x) ? g - b : ((g == x) ? b - r : r - g);
    const catnip_f64_t i = (r == x) ? 3 : ((g == x) ? 5 : 1);
    h = catnip_math_fmod((i - (f / (v - x))) * 60, 360) / 360;      
    s = (v - x) / v;
  }

  CATNIP_ASSERT(a >= 0 && a <= 1);
  CATNIP_ASSERT(h >= 0 && h <= 1);
  CATNIP_ASSERT(s >= 0 && s <= 1);
  CATNIP_ASSERT(v >= 0 && v <= 1);

  target->pen_thsv_valid = CATNIP_TRUE;
  target->pen_transparency = (1 - a) * 100;
  target->pen_hue = h * 100;
  target->pen_satuation = s * 100;
  target->pen_value = v * 100;
}

void catnip_blockutil_pen_update_argb(catnip_target *target) {

  CATNIP_ASSERT(target->pen_thsv_valid);
  CATNIP_ASSERT(!target->pen_argb_valid);

  catnip_f64_t h = (target->pen_hue / 100) * 360;
  catnip_f64_t s = target->pen_satuation / 100;
  catnip_f64_t v = target->pen_value / 100;

  h = catnip_math_fmod(h, 360);
  if (h < 0) h += 360;
  
  s = CATNIP_MAX(0, CATNIP_MIN(s, 1));
  v = CATNIP_MAX(0, CATNIP_MIN(v, 1));

  const catnip_i32_t i = (catnip_i32_t) (h / 60);
  const catnip_f64_t f = (h / 60) - i;
  const catnip_f64_t p = v * (1 - s);
  const catnip_f64_t q = v * (1 - (s * f));
  const catnip_f64_t t = v * (1 - (s * (1 - f)));

  catnip_f64_t r;
  catnip_f64_t g;
  catnip_f64_t b;

  switch (i) {
  default:
  case 0:
      r = v;
      g = t;
      b = p;
      break;
  case 1:
      r = q;
      g = v;
      b = p;
      break;
  case 2:
      r = p;
      g = v;
      b = t;
      break;
  case 3:
      r = p;
      g = q;
      b = v;
      break;
  case 4:
      r = t;
      g = p;
      b = v;
      break;
  case 5:
      r = v;
      g = p;
      b = q;
      break;
  }

  CATNIP_ASSERT(t >= 0 && t <= 1);
  CATNIP_ASSERT(r >= 0 && r <= 1);
  CATNIP_ASSERT(g >= 0 && g <= 1);
  CATNIP_ASSERT(b >= 0 && b <= 1);

  catnip_ui32_t aI = (catnip_ui32_t) ((1 - target->pen_transparency) * 255.0);
  catnip_ui32_t rI = (catnip_ui32_t) (r * 255.0);
  catnip_ui32_t gI = (catnip_ui32_t) (g * 255.0);
  catnip_ui32_t bI = (catnip_ui32_t) (b * 255.0);

  target->pen_argb_valid = CATNIP_TRUE;
  target->pen_argb = (aI << 24) | (rI << 16) | (gI << 8) | bI;
}

void catnip_blockutil_pen_down(catnip_target *target) {
  target->pen_down = CATNIP_TRUE;

  catnip_runtime_render_pen_draw_line(
    target->runtime,
    target,
    target->position_x,
    target->position_y,
    target->position_x,
    target->position_y
  );
}

void catnip_blockutil_list_push(catnip_list *list, catnip_f64_t value) {
  CATNIP_LIST_ADD(list, catnip_f64_t, value);
}

void catnip_blockutil_list_delete_at(catnip_list *list, catnip_i32_t index) {
  CATNIP_LIST_REMOVE(list, catnip_f64_t, index);
}

void catnip_blockutil_list_insert_at(catnip_list *list, catnip_i32_t index, catnip_f64_t value) {
  CATNIP_LIST_INSERT(list, catnip_f64_t, index, value);
}

void catnip_blockutil_costume_set(catnip_target *target, catnip_hstring *costume) {

  for (catnip_i32_t i = 0; i < target->sprite->costume_count; i++) {
    if (catnip_hstring_equal(costume, target->sprite->costumes[i].name)) {

      // We found the right costume
      target->costume = i;

      return;
    }
  }

  // No right costume :c

  // TODO Check for 'next costume' and 'previous costume'

  catnip_f64_t cast = catnip_numconv_parse(target->runtime, costume);

  if (CATNIP_F64_ISNAN(cast)) return;

  // If the string is whitespace, we don't do anything
  if (CATNIP_HSTRING_LENGTH(catnip_hstring_trim(target->runtime, costume)) == 0)
    return;

  cast = catnip_math_round(cast - 1);

  if (CATNIP_F64_ISINFINITE(cast)) cast = 0;

  cast = catnip_math_fmod(cast, target->sprite->costume_count);

  if (cast < 0) cast += target->sprite->costume_count;

  target->costume = (catnip_ui32_t) cast;
}
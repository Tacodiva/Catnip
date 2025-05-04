
#include "./catnip.h"

catnip_wchar_t *catnip_hstring_get_data(const catnip_hstring *str) {
  CATNIP_ASSERT(str != CATNIP_NULL);

  return ((void *)str) + sizeof(catnip_hstring);
}

catnip_hstring *catnip_hstring_new_simple(catnip_runtime *runtime, catnip_ui32_t len) {
  return (catnip_hstring *) catnip_runtime_gc_new_obj(runtime, sizeof(catnip_hstring) + len * sizeof(catnip_wchar_t));
}


catnip_hstring *catnip_hstring_new(catnip_runtime *runtime, const catnip_wchar_t *chars, catnip_ui32_t len) {

  catnip_hstring *str = catnip_hstring_new_simple(runtime, len);

  if (len != 0) {
    CATNIP_ASSERT(chars != CATNIP_NULL);
    catnip_mem_copy(catnip_hstring_get_data(str), chars, len * sizeof(catnip_wchar_t));
  }

  return str;
}

catnip_hstring *catnip_hstring_new_from_ascii(catnip_runtime *runtime, const catnip_char_t *chars, catnip_ui32_t len) {
  catnip_hstring *str = catnip_hstring_new_simple(runtime, len);
  catnip_wchar_t *data = catnip_hstring_get_data(str);

  for (catnip_ui32_t i = 0; i < len; i++) {
    data[i] = chars[i];
  }
  
  return str;
}

catnip_hstring *catnip_hstring_new_from_cstring(catnip_runtime *runtime, const char *cstr) {
  CATNIP_ASSERT(cstr != CATNIP_NULL);

  const char *scan = cstr;
  while (*scan != '\0')
    ++scan;

  return catnip_hstring_new_from_ascii(runtime, cstr, scan - cstr);
}

void catnip_hstring_print(const catnip_hstring *str) {
  CATNIP_ASSERT(str != CATNIP_NULL);

  catnip_import_log(catnip_hstring_get_data(str), CATNIP_HSTRING_LENGTH(str));
}

// https://github.com/svaarala/duktape/blob/50af773b1b32067170786c2b7c661705ec7425d4/src-input/duk_api_string.c#L293
catnip_hstring *catnip_hstring_trim(catnip_runtime *runtime, catnip_hstring *str) {
  CATNIP_ASSERT(str != CATNIP_NULL);

  const catnip_wchar_t *ptr_start = catnip_hstring_get_data(str);
  const catnip_wchar_t *ptr_end = ptr_start + CATNIP_HSTRING_LENGTH(str);

  const catnip_wchar_t *ptr = ptr_start;

  while (ptr < ptr_end) {
    const catnip_wchar_t *tmp = ptr;
    catnip_codepoint_t cp = catnip_unicode_decode_utf16(&tmp, ptr_end);

    if (!(catnip_unicode_is_whitespace(cp) ||
          catnip_unicode_is_line_terminator(cp)))
      break;

    ptr = tmp;
  }

  const catnip_wchar_t *trim_start = ptr;

  if (trim_start == ptr_end) {
    // Entire string is whitespace
    return CATNIP_STRING_BLANK;
  }

  ptr = ptr_end;

  while (ptr > ptr_start) {
    const catnip_wchar_t *tmp1 = ptr;

    catnip_codepoint_t cp = catnip_unicode_decode_utf16_backwards(&ptr, ptr_start);

    if (!(catnip_unicode_is_whitespace(cp) ||
          catnip_unicode_is_line_terminator(cp))) {
      ptr = tmp1;
      break;
    }
  }

  const catnip_wchar_t *trim_end = ptr;

  /* This may happen when forward and backward scanning disagree
	 * (possible for non-extended-UTF-8 strings). */

  if (trim_end < trim_start) {
    trim_end = trim_start;
  }

  CATNIP_ASSERT(trim_start >= ptr_start && trim_start <= trim_end);
  CATNIP_ASSERT(trim_end >= ptr_start && trim_end <= ptr_end);
  CATNIP_ASSERT(trim_end >= trim_start);

  if (trim_start == ptr_start && trim_end == ptr_end) {
    // Nothing was trimmed, no need to duplicate the string
    return str;
  }

  return catnip_hstring_new(runtime, trim_start, (catnip_ui32_t) (trim_end - trim_start));
}

catnip_bool_t catnip_hstring_equal(catnip_hstring *a, catnip_hstring *b) {
  if (a == b)
    return CATNIP_TRUE;

  if (a == CATNIP_NULL || b == CATNIP_NULL)
    return CATNIP_FALSE;

  const catnip_ui32_t len = CATNIP_HSTRING_LENGTH(a);

  if (len != CATNIP_HSTRING_LENGTH(b))
    return CATNIP_FALSE;

  const catnip_wchar_t *aDat = catnip_hstring_get_data(a);
  const catnip_wchar_t *bDat = catnip_hstring_get_data(b);

  for (catnip_ui32_t i = 0; i < len; i++) {
    if (aDat[i] != bDat[i]) return CATNIP_FALSE;
  }

  return CATNIP_TRUE;
}

catnip_bool_t catnip_hstring_contains_char(catnip_hstring *str, catnip_wchar_t c) {

  catnip_wchar_t *strData = catnip_hstring_get_data(str);
  catnip_ui32_t strLen = CATNIP_HSTRING_LENGTH(str);
  catnip_wchar_t *strDataEnd = strData + strLen;

  while (strData != strDataEnd) {

    if (*strData == c) return CATNIP_TRUE;

    ++strData;
    
    CATNIP_ASSERT(strData <= strDataEnd);
  }

  return CATNIP_FALSE;
}
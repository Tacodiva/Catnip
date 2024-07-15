
#include "./catnip.h"

void catnip_hstring_ref(catnip_hstring *str) {
  CATNIP_ASSERT(str != CATNIP_NULL);
  ++str->refcount;
}

void catnip_hstring_deref(catnip_hstring *str) {
  CATNIP_ASSERT(str != CATNIP_NULL);

  catnip_ui32_t refcount;

  refcount = --str->refcount;

  if (refcount == 0) {
    catnip_mem_free(str);
  }
}

catnip_char_t *catnip_hstring_get_data(const catnip_hstring *str) {
  CATNIP_ASSERT(str != CATNIP_NULL);

  return ((catnip_char_t *)str) + sizeof(catnip_hstring);
}

catnip_hstring *catnip_hstring_new(const catnip_char_t *chars,
                                   catnip_ui32_t len) {

  // TODO what if len is 0?

  catnip_hstring *str;

  str = catnip_mem_alloc(sizeof(catnip_hstring) + len);

  str->bytelen = len;
  str->refcount = 1;

  if (len != 0) {
    CATNIP_ASSERT(chars != CATNIP_NULL);
    catnip_mem_copy(catnip_hstring_get_data(str), chars, len);
  }

  return str;
}

catnip_hstring *catnip_hstring_new_from_cstring(const char *cstr) {
  CATNIP_ASSERT(cstr != CATNIP_NULL);

  const char *scan = cstr;
  while (*scan != '\0')
    ++scan;

  return catnip_hstring_new((catnip_char_t *)cstr,
                            (catnip_ui32_t)(scan - cstr));
}

void catnip_hstring_print(const catnip_hstring *str) {
  CATNIP_ASSERT(str != CATNIP_NULL);

  catnip_import_log(catnip_hstring_get_data(str), str->bytelen);
}

// https://github.com/svaarala/duktape/blob/50af773b1b32067170786c2b7c661705ec7425d4/src-input/duk_api_string.c#L293
catnip_hstring *catnip_str_trim(catnip_hstring *str) {
  CATNIP_ASSERT(str != CATNIP_NULL);

  const catnip_char_t *ptr_start = catnip_hstring_get_data(str);
  const catnip_char_t *ptr_end = ptr_start + str->bytelen;

  const catnip_char_t *ptr = ptr_start;

  while (ptr < ptr_end) {
    const catnip_char_t *tmp = ptr;
    catnip_codepoint_t cp =
        catnip_unicode_decode_utf8_checked(&tmp, ptr_start, ptr_end);

    if (!(catnip_unicode_is_whitespace(cp) ||
          catnip_unicode_is_line_terminator(cp)))
      break;

    ptr = tmp;
  }

  const catnip_char_t *trim_start = ptr;

  if (trim_start == ptr_end) {
    // Entire string is whitespace
    return catnip_hstring_new(CATNIP_NULL, 0);
  }

  ptr = ptr_end;

  while (ptr > ptr_start) {
    const catnip_char_t *tmp1 = ptr;

    while (ptr > ptr_start) {
      --ptr;
      if (((*ptr) & 0xC0) != 0x80) // Scan backward through the codepoints?
        break;
    }

    const catnip_char_t *tmp2 = ptr;

    catnip_codepoint_t cp =
        catnip_unicode_decode_utf8_checked(&tmp2, ptr_start, ptr_end);

    if (!(catnip_unicode_is_whitespace(cp) ||
          catnip_unicode_is_line_terminator(cp))) {
      ptr = tmp1;
      break;
    }
  }

  const catnip_char_t *trim_end = ptr;

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
    catnip_hstring_ref(str);
    return str;
  }

  return catnip_hstring_new(trim_start, (catnip_ui32_t) (trim_end - trim_start));
}
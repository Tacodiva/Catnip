
#include "./catnip_strings.h"

catnip_hstring *get_canon(catnip_char_t *string) {
  const catnip_char_t *scan = string;
  while (*scan != '\0')
    ++scan;

  const catnip_ui32_t length = scan - string;

  catnip_wchar_t *utf16 = catnip_mem_alloc(length * sizeof(catnip_wchar_t));

  for (catnip_ui32_t i = 0; i < length; i++) {
    utf16[i] = string[i];
  }

  catnip_hstring *hstring = catnip_import_get_canon_string(utf16, scan - string);

  catnip_mem_free(utf16);

  return hstring;
}

catnip_hstring *CATNIP_STRING_BLANK;
catnip_hstring *CATNIP_STRING_NAN;
catnip_hstring *CATNIP_STRING_POS_INFINITY;
catnip_hstring *CATNIP_STRING_NEG_INFINITY;
catnip_hstring *CATNIP_STRING_PRINTABLE_ASCII_CHAR[95];

void catnip_strings_init() {
  CATNIP_STRING_BLANK = catnip_import_get_canon_string(CATNIP_NULL, 0);
  CATNIP_STRING_NAN = get_canon("NaN");
  CATNIP_STRING_POS_INFINITY = get_canon("Infinity");
  CATNIP_STRING_NEG_INFINITY = get_canon("-Infinity");

  for (catnip_ui32_t i = 0; i < 95; i++) {
    catnip_wchar_t asciiChar = i + 32;
    CATNIP_STRING_PRINTABLE_ASCII_CHAR[i] = catnip_import_get_canon_string(&asciiChar, 1);
  }
}
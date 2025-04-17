
#ifndef CATNIP_HSTRING_H_INCLUDED
#define CATNIP_HSTRING_H_INCLUDED

#include "./catnip.h"

struct catnip_hstring {
  catnip_obj_head obj_head;
};

typedef struct catnip_hstring catnip_hstring;

catnip_char_t *catnip_hstring_get_data(const catnip_hstring *str);
catnip_hstring *catnip_hstring_new_simple(catnip_runtime *runtime, catnip_ui32_t len);
catnip_hstring *catnip_hstring_new(catnip_runtime *runtime, const catnip_char_t *chars, catnip_ui32_t len);
catnip_hstring *catnip_hstring_new_from_cstring(catnip_runtime *runtime, const char *cstr);
void catnip_hstring_print(const catnip_hstring *str);
catnip_hstring *catnip_str_trim(catnip_runtime *runtime, catnip_hstring *str);

#define CATNIP_HSTRING_BYTELENGTH(str) str->obj_head.bytelen - sizeof(catnip_hstring)

#endif
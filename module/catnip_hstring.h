
#ifndef CATNIP_HSTRING_H_INCLUDED
#define CATNIP_HSTRING_H_INCLUDED

#include "./catnip.h"

struct catnip_hstring {

  catnip_ui32_t refcount;

  catnip_ui32_t bytelen;
};

typedef struct catnip_hstring catnip_hstring;

void catnip_hstring_ref(catnip_hstring *str);
void catnip_hstring_deref(catnip_hstring *str);
catnip_char_t *catnip_hstring_get_data(const catnip_hstring *str);
catnip_hstring *catnip_hstring_new(const catnip_char_t *chars,
                                   catnip_ui32_t len);
catnip_hstring *catnip_hstring_new_from_cstring(const char *cstr);
void catnip_hstring_print(const catnip_hstring *str);
catnip_bool_t catnip_hstring_cmp_cstring(const catnip_hstring *str1, const char* str2);
catnip_hstring *catnip_str_trim(catnip_hstring *str);

#endif
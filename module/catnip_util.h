
#ifndef CATNIP_UTIL_H_INCLUDED
#define CATNIP_UTIL_H_INCLUDED

#include "./catnip.h"

catnip_i32_t catnip_util_strcmp(const catnip_char_t* str1, const catnip_char_t* str2, catnip_ui32_t n);
catnip_i32_t catnip_util_strcmp_w(const catnip_wchar_t *str1, const catnip_char_t *str2, catnip_ui32_t n);

void catnip_util_print(const catnip_char_t *string);
void catnip_util_print_int(catnip_ui32_t value);

#endif
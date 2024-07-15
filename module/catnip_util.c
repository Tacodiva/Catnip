
#include "./catnip.h"

catnip_i32_t catnip_util_strcmp(const catnip_char_t *str1,
                                 const catnip_char_t *str2,
                                 catnip_ui32_t n) {
  catnip_ui32_t i = 0;
  catnip_ui32_t res = 0;
  while ((str1[i] == str2[i]) && (str1[i] != '\0') && (str2[i] != '\0')) {
    i++;
    if (i > n) return 0;
  }
  return ((catnip_uchar_t)str1[i] - (catnip_uchar_t)str2[i]);
}

void catnip_util_print(const catnip_char_t* string) {

  const catnip_char_t* scan = string;
  while (*scan != '\0') ++scan;

  catnip_import_log(string, scan - string);
}

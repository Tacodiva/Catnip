
#include "./catnip.h"

catnip_i32_t catnip_util_strcmp(const catnip_char_t *str1,
                                 const catnip_char_t *str2,
                                 catnip_ui32_t n) {
  catnip_ui32_t i = 0;
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

void catnip_util_print_int(catnip_ui32_t value) {
  catnip_char_t buf[11];

  catnip_char_t *ptr = &buf[10];

    do {
        const catnip_ui32_t tmp_value = value;
        value /= 10;
        *ptr-- = "0123456789"[(tmp_value - value * 10)];
    } while ( value );

    catnip_import_log(ptr + 1, &buf[11] - ptr);
}

char* itoa(int value, char* result, int base) {
    // check that the base if valid
    if (base < 2 || base > 36) { *result = '\0'; return result; }

    char* ptr = result, *ptr1 = result, tmp_char;
    int tmp_value;

    do {
        tmp_value = value;
        value /= base;
        *ptr++ = "zyxwvutsrqponmlkjihgfedcba9876543210123456789abcdefghijklmnopqrstuvwxyz" [35 + (tmp_value - value * base)];
    } while ( value );

    // Apply negative sign
    if (tmp_value < 0) *ptr++ = '-';
    *ptr-- = '\0';
  
    // Reverse the string
    while(ptr1 < ptr) {
        tmp_char = *ptr;
        *ptr--= *ptr1;
        *ptr1++ = tmp_char;
    }
    return result;
}
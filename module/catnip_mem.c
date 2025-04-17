
#include "./catnip.h"
#include "./walloc.c"

void *catnip_mem_alloc(catnip_ui32_t n) {
  void *allocation = malloc(n);
  CATNIP_ASSERT(allocation != CATNIP_NULL);
  return allocation;
}

void catnip_mem_free(void *p) {
  free(p);
}

void catnip_mem_copy(void *dst, const void *src, catnip_ui32_t len) {
#if __wasm_bulk_memory__
  __builtin_memcpy(dst, src, len);
#else
  const catnip_char_t *source = src;
  catnip_char_t *destination = dst;

  for (catnip_ui32_t i = 0; i < len; i++) {
    destination[i] = source[i];
  }
#endif
}

void *catnip_mem_zero(void *dst, catnip_ui32_t len) { 
#if __wasm_bulk_memory__
  return __builtin_memset(dst, 0, len);
#else
  CATNIP_ASSERT(len > 0);
  catnip_uchar_t *dest_p = (catnip_uchar_t *)dst;
  while (len-- != 0) {
    *dest_p++ = 0;
  }
  return dest_p;
#endif
}

void *catnip_mem_move(void *dst, const void *src, catnip_ui32_t n) {
#if __wasm_bulk_memory__
  return __builtin_memmove(dst, src, n);
#else
  catnip_uchar_t *dest_p = (catnip_uchar_t *)dst;
  const catnip_uchar_t *src_p = (const catnip_uchar_t *)src;
  if (dest_p < src_p) {
    while (n--)
      *dest_p++ = *src_p++;
  } else {
    dest_p += n - 1;
    src_p += n - 1;
    while (n--)
      *dest_p-- = *src_p--;
  }
  return dst;
#endif
}

catnip_i32_t catnip_mem_cmp(const void *buf1, const void *buf2, catnip_ui32_t len) {
  const catnip_uchar_t *buf1Ptr = buf1;
  const catnip_uchar_t *buf2Ptr = buf2;

  for (catnip_ui32_t i = 0; i < len; i++, buf1Ptr++, buf2Ptr++) {
    if (*buf1Ptr < *buf2Ptr)
      return -1;
    
    if (*buf1Ptr > *buf2Ptr)
      return 1;
  }

  return 0;
}
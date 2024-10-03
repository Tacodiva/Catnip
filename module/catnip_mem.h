
#ifndef CATNIP_MEM_H_INCLUDED
#define CATNIP_MEM_H_INCLUDED

#include "./catnip.h"

void *catnip_mem_alloc(catnip_ui32_t len);
void catnip_mem_free(void *allocation);
void catnip_mem_copy(void *dst, const void* src, catnip_ui32_t len);
void *catnip_mem_zero(void *ptr, catnip_ui32_t len);
void *catnip_mem_move(void *dest, const void *src, catnip_ui32_t len);
catnip_i32_t catnip_mem_cmp(const void *buf1, const void *buf2, catnip_ui32_t len);

#endif
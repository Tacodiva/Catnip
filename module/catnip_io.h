
#ifndef CATNIP_IO_H_INCLUDED
#define CATNIP_IO_H_INCLUDED

#include "./catnip.h"

struct catnip_io_keys {
    catnip_ui32_t key_down_count;
    catnip_uchar_t keys[256];
};

typedef struct catnip_io_keys catnip_io_keys;

void catnip_io_key_pressed(catnip_runtime *runtime, catnip_ui32_t charCode);
void catnip_io_key_released(catnip_runtime *runtime, catnip_ui32_t charCode);

#endif
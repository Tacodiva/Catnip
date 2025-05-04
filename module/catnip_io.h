
#ifndef CATNIP_IO_H_INCLUDED
#define CATNIP_IO_H_INCLUDED

#include "./catnip.h"

struct catnip_io {
    catnip_ui32_t key_down_count;
    catnip_bool_t mouse_down;
    catnip_f64_t mouse_x;
    catnip_f64_t mouse_y;
    catnip_uchar_t keys[256];
};

typedef struct catnip_io catnip_io;

catnip_bool_t catnip_io_is_key_pressed(catnip_runtime *runtime, catnip_value key);
void catnip_io_key_pressed(catnip_runtime *runtime, catnip_ui32_t charCode);
void catnip_io_key_released(catnip_runtime *runtime, catnip_ui32_t charCode);
void catnip_io_mouse_move(catnip_runtime *runtime, catnip_f64_t x, catnip_f64_t y);
void catnip_io_mouse_down(catnip_runtime *runtime);
void catnip_io_mouse_up(catnip_runtime *runtime);

#endif
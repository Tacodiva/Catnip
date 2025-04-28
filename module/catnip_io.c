
#include "./catnip_io.h"

void catnip_io_key_pressed(catnip_runtime *runtime, catnip_ui32_t charCode) {
  CATNIP_ASSERT(charCode >= 0 && charCode < 256);

  catnip_uchar_t *keyPtr = &runtime->io->keys[charCode];

  if (*keyPtr) return;

  ++runtime->io->key_down_count;
  *keyPtr = 1;

}

void catnip_io_key_released(catnip_runtime *runtime, catnip_ui32_t charCode) {
  CATNIP_ASSERT(charCode >= 0 && charCode < 256);

  catnip_uchar_t *keyPtr = &runtime->io->keys[charCode];

  if (!*keyPtr) return;

  --runtime->io->key_down_count;
  *keyPtr = 0;
}

void catnip_io_mouse_move(catnip_runtime *runtime, catnip_f64_t x, catnip_f64_t y) {
  runtime->io->mouse_x = x;
  runtime->io->mouse_y = y;
} 

void catnip_io_mouse_down(catnip_runtime *runtime) {
  runtime->io->mouse_down = CATNIP_TRUE;
}

void catnip_io_mouse_up(catnip_runtime *runtime) {
  runtime->io->mouse_down = CATNIP_FALSE;
}
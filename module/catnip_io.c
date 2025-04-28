
#include "./catnip_io.h"

void catnip_io_key_pressed(catnip_runtime *runtime, catnip_ui32_t charCode) {
  CATNIP_ASSERT(charCode >= 0 && charCode < 256);

  catnip_uchar_t *keyPtr = &runtime->io_keys->keys[charCode];

  if (*keyPtr) return;

  ++runtime->io_keys->key_down_count;
  *keyPtr = 1;

}

void catnip_io_key_released(catnip_runtime *runtime, catnip_ui32_t charCode) {
  CATNIP_ASSERT(charCode >= 0 && charCode < 256);

  catnip_uchar_t *keyPtr = &runtime->io_keys->keys[charCode];

  if (!*keyPtr) return;

  --runtime->io_keys->key_down_count;
  *keyPtr = 0;
}
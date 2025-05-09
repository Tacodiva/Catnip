
#include "./catnip_io.h"



catnip_ui32_t get_key_code(catnip_runtime *runtime, catnip_value key) {
  // TODO Support 'any'

  catnip_hstring *keyName;

  if (CATNIP_VALUE_IS_STRING(key)) {
    keyName = CATNIP_VALUE_AS_STRING(key);
  } else {

    catnip_f64_t keyCode = CATNIP_VALUE_AS_NUMBER(key);

    if (keyCode >= 48 && keyCode <= 90) return (catnip_ui32_t) keyCode;

    if (keyCode >= 0 && keyCode <= 9 && keyCode == CATNIP_F64_FLOOR(keyCode))
      return '0' + keyCode; 

    keyName = catnip_numconv_stringify_f64(runtime, keyCode);
  }

  CATNIP_ASSERT(CATNIP_FALSE);
  return -1;
}

catnip_bool_t catnip_io_is_key_pressed(catnip_runtime *runtime, catnip_value key) {

  catnip_ui32_t keyCode = get_key_code(runtime, key);

  CATNIP_ASSERT(keyCode < 256);

  return runtime->io->keys[keyCode];
}

void catnip_io_key_pressed(catnip_runtime *runtime, catnip_ui32_t charCode) {
  CATNIP_ASSERT(charCode < 256);

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
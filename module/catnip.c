
#include "./catnip.h"

void CATNIP_EXPORT(catnip_init)() {
  catnip_strings_init();
}

void *CATNIP_EXPORT(catnip_mem_alloc)(catnip_ui32_t length, catnip_bool_t zero) {
  void *ptr = catnip_mem_alloc(length);
  if (zero)
    catnip_mem_zero(ptr, length);
  return ptr;
}

void CATNIP_EXPORT(catnip_mem_free)(void *ptr) {
  catnip_mem_free(ptr);
}

catnip_hstring *CATNIP_EXPORT(catnip_numconv_stringify_f64)(catnip_f64_t value, catnip_runtime *runtime) {
  return catnip_numconv_stringify_f64(runtime, value);
}

catnip_f64_t CATNIP_EXPORT(catnip_numconv_parse)(catnip_hstring *str, catnip_runtime *runtime) {
  return catnip_numconv_parse(runtime, str);
}


catnip_runtime *CATNIP_EXPORT(catnip_runtime_new)() {
  return catnip_runtime_new();
}

void CATNIP_EXPORT(catnip_runtime_tick)(catnip_runtime *runtime) {
  catnip_runtime_tick(runtime);
}

void CATNIP_EXPORT(catnip_runtime_start_threads)(catnip_runtime *runtime, catnip_sprite *sprite, catnip_thread_fnptr entrypoint, catnip_list *threadList) {
  return catnip_runtime_start_threads(runtime, sprite, entrypoint, threadList);
}

void CATNIP_EXPORT(catnip_runtime_render_pen_flush)(catnip_runtime *runtime) {
  catnip_runtime_render_pen_flush(runtime);
}

catnip_hstring *CATNIP_EXPORT(catnip_runtime_new_hstring)(catnip_runtime *runtime, catnip_ui32_t length) {
  return catnip_hstring_new_simple(runtime, length);
}


catnip_target *CATNIP_EXPORT(catnip_target_new)(catnip_runtime *runtime, catnip_sprite *sprite) {
  return catnip_target_new(runtime, sprite);
}

void CATNIP_EXPORT(catnip_target_start_new_thread)(catnip_target *target, catnip_thread_fnptr entrypoint, catnip_list *threadList) {
  catnip_target_start_new_thread(target, entrypoint, threadList);
}

void CATNIP_EXPORT(catnip_target_set_xy)(catnip_f64_t x, catnip_f64_t y, catnip_target *target) {
  catnip_target_set_xy(target, x, y);
}


catnip_thread *CATNIP_EXPORT(catnip_thread_new)(catnip_target *target, catnip_thread_fnptr fnptr) {
  return catnip_thread_new(target, fnptr);
}

void CATNIP_EXPORT(catnip_thread_yield)(catnip_thread *thread, catnip_thread_fnptr fnptr) {
  return catnip_thread_yield(thread, fnptr);
}

void CATNIP_EXPORT(catnip_thread_terminate)(catnip_thread *thread) {
  return catnip_thread_terminate(thread);
}


void CATNIP_EXPORT(catnip_blockutil_debug_log)(catnip_hstring *str) {
  catnip_blockutil_debug_log(str);
}

void CATNIP_EXPORT(catnip_blockutil_debug_log_int)(catnip_ui32_t x) {
  catnip_blockutil_debug_log_int(x);
}

catnip_thread_status CATNIP_EXPORT(catnip_blockutil_wait_for_threads)(catnip_list *threadList) {
  return catnip_blockutil_wait_for_threads(threadList);
}

catnip_i32_t CATNIP_EXPORT(catnip_blockutil_hstring_cmp)(catnip_hstring *a, catnip_hstring *b) {
  return catnip_blockutil_hstring_cmp(a, b);
}

catnip_i32_t CATNIP_EXPORT(catnip_blockutil_value_cmp)(catnip_f64_t a, catnip_f64_t b, catnip_runtime *runtime) {
  return catnip_blockutil_value_cmp(runtime, CATNIP_VALUE_FROM_F64(a), CATNIP_VALUE_FROM_F64(b));
}

catnip_bool_t CATNIP_EXPORT(catnip_blockutil_value_eq)(catnip_f64_t a, catnip_f64_t b, catnip_runtime *runtime) {
  return catnip_blockutil_value_eq(runtime, CATNIP_VALUE_FROM_F64(a), CATNIP_VALUE_FROM_F64(b));
}

catnip_bool_t CATNIP_EXPORT(catnip_blockutil_hstring_eq_strict)(const catnip_hstring *a, const catnip_hstring *b) {
  return catnip_hstring_equal(a, b);
}

catnip_hstring *CATNIP_EXPORT(catnip_blockutil_hstring_join)(const catnip_hstring *a, const catnip_hstring *b, catnip_runtime *runtime) {
  return catnip_blockutil_hstring_join(runtime, a, b);
}

catnip_ui32_t CATNIP_EXPORT(catnip_blockutil_hstring_length)(catnip_hstring *str) {
  return catnip_blockutil_hstring_length(str);
}

catnip_hstring *CATNIP_EXPORT(catnip_blockutil_hstring_char_at)(catnip_hstring *str, catnip_ui32_t index, catnip_runtime *runtime) {
  return catnip_blockutil_hstring_char_at(runtime, str, index);
}

catnip_bool_t CATNIP_EXPORT(catnip_blockutil_hstring_contains)(catnip_hstring *str, catnip_hstring *contains) {
  return catnip_blockutil_hstring_contains(str, contains);
}

catnip_ui32_t CATNIP_EXPORT(catnip_blockutil_hstring_to_argb)(const catnip_hstring *str) {
  return catnip_blockutil_hstring_to_argb(str);
}


void CATNIP_EXPORT(catnip_blockutil_pen_update_thsv)(catnip_target *target) {
  catnip_blockutil_pen_update_thsv(target);
}

void CATNIP_EXPORT(catnip_blockutil_pen_update_argb)(catnip_target *target) {
  catnip_blockutil_pen_update_argb(target);
}

void CATNIP_EXPORT(catnip_blockutil_pen_down)(catnip_target *thread) {
  catnip_blockutil_pen_down(thread);
}

void CATNIP_EXPORT(catnip_blockutil_list_push)(catnip_f64_t value, catnip_list *list) {
  catnip_blockutil_list_push(list, value);
}

void CATNIP_EXPORT(catnip_blockutil_list_delete_at)(catnip_i32_t index, catnip_list *list) {
  catnip_blockutil_list_delete_at(list, index);
}

void CATNIP_EXPORT(catnip_blockutil_list_insert_at)(catnip_i32_t index, catnip_f64_t value, catnip_list *list) {
  catnip_blockutil_list_insert_at(list, index, value);
}

void CATNIP_EXPORT(catnip_blockutil_costume_set)(catnip_hstring *costume, catnip_target *target) {
  catnip_blockutil_costume_set(target, costume);
}

catnip_f64_t CATNIP_EXPORT(catnip_blockutil_operator_random)(catnip_f64_t a, catnip_f64_t b, catnip_runtime *runtime) {
  return catnip_blockutil_operator_random(runtime, (catnip_value) a, (catnip_value) b);
}


void CATNIP_EXPORT(catnip_thread_resize_stack)(catnip_thread *thread, catnip_ui32_t extraCapacity) {
  catnip_thread_resize_stack(thread, extraCapacity);
}


catnip_list *CATNIP_EXPORT(catnip_list_new)(catnip_ui32_t item_size, catnip_ui32_t capacity) {
  return catnip_list_new(item_size, capacity);
}


catnip_f64_t CATNIP_EXPORT(catnip_math_fmod)(catnip_f64_t x, catnip_f64_t y) {
  return catnip_math_fmod(x, y);
}

catnip_f64_t CATNIP_EXPORT(catnip_math_round)(catnip_f64_t n) {
  return catnip_math_round(n);
}

catnip_f64_t CATNIP_EXPORT(catnip_math_log)(catnip_f64_t x) {
  return catnip_math_log(x);
}

catnip_f64_t CATNIP_EXPORT(catnip_math_exp)(catnip_f64_t x) {
  return catnip_math_exp(x);
}

catnip_f64_t CATNIP_EXPORT(catnip_math_pow)(catnip_f64_t x, catnip_f64_t y) {
  return catnip_math_pow(x, y);
}

catnip_f64_t CATNIP_EXPORT(catnip_math_sin)(catnip_f64_t x) {
  return catnip_math_round(catnip_math_sin((CATNIP_F64_PI * x) / 180) * 1e10) / 1e10;
}

catnip_f64_t CATNIP_EXPORT(catnip_math_cos)(catnip_f64_t x) {
  return catnip_math_round(catnip_math_cos((CATNIP_F64_PI * x) / 180) * 1e10) / 1e10;
}

catnip_f64_t CATNIP_EXPORT(catnip_math_tan)(catnip_f64_t x) {
  x = catnip_math_fmod(x, 360);
  if (x == -270 || x == 90) return CATNIP_F64_INFINITY;
  if (x == 270 || x == -90) return -CATNIP_F64_INFINITY;
  return catnip_math_round(catnip_math_tan((CATNIP_F64_PI * x) / 180) * 1e10) / 1e10;
}

catnip_f64_t CATNIP_EXPORT(catnip_math_atan)(catnip_f64_t x) {
  return catnip_math_atan(x) * 180 / CATNIP_F64_PI;
}


catnip_bool_t CATNIP_EXPORT(catnip_io_is_key_pressed)(catnip_f64_t key, catnip_runtime *runtime) {
  return catnip_io_is_key_pressed(runtime, (catnip_value) key);
}

void CATNIP_EXPORT(catnip_io_key_pressed)(catnip_runtime *runtime, catnip_ui32_t keyCode) {
  catnip_io_key_pressed(runtime, keyCode);
}

void CATNIP_EXPORT(catnip_io_key_released)(catnip_runtime *runtime, catnip_ui32_t keyCode) {
  catnip_io_key_released(runtime, keyCode);
}

void CATNIP_EXPORT(catnip_io_mouse_move)(catnip_runtime *runtime, catnip_f64_t x, catnip_f64_t y) {
  catnip_io_mouse_move(runtime, x, y);
}

void CATNIP_EXPORT(catnip_io_mouse_down)(catnip_runtime *runtime) {
  catnip_io_mouse_down(runtime);
}

void CATNIP_EXPORT(catnip_io_mouse_up)(catnip_runtime *runtime) {
  catnip_io_mouse_up(runtime);
}
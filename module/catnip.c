
#include "./catnip.h"

void CATNIP_EXPORT(main)(catnip_runtime *runtime) {
  catnip_f64_t first;
  catnip_f64_t second;
  catnip_f64_t nth;

  for (catnip_ui32_t i = 0; i < 100000; i++) {
    first = 0;
    second = 1;
    nth = 1;

    for (catnip_ui32_t j = 0; j < 1200; j++) {
      nth = first + second;
      first = second;
      second = nth;
    }
  }

  catnip_hstring *str = catnip_numconv_stringify_f64(runtime, nth);
  catnip_blockutil_debug_log(str);
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


catnip_target *CATNIP_EXPORT(catnip_target_new)(catnip_runtime *runtime, catnip_sprite *sprite) {
  return catnip_target_new(runtime, sprite);
}

void CATNIP_EXPORT(catnip_target_start_new_thread)(catnip_target *target, catnip_thread_fnptr entrypoint, catnip_list *threadList) {
  catnip_target_start_new_thread(target, entrypoint, threadList);
}

void CATNIP_EXPORT(catnip_target_set_xy)(catnip_i32_t x, catnip_i32_t y, catnip_target *target) {
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

catnip_hstring *CATNIP_EXPORT(catnip_blockutil_hstring_join)(const catnip_hstring *a, const catnip_hstring *b, catnip_runtime *runtime) {
  return catnip_blockutil_hstring_join(runtime, a, b);
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


void CATNIP_EXPORT(catnip_thread_resize_stack)(catnip_thread *thread, catnip_ui32_t extraCapacity) {
  catnip_thread_resize_stack(thread, extraCapacity);
}


catnip_list *CATNIP_EXPORT(catnip_list_new)(catnip_ui32_t item_size, catnip_ui32_t capacity) {
  return catnip_list_new(item_size, capacity);
}

catnip_f64_t CATNIP_EXPORT(catnip_math_fmod)(catnip_f64_t x, catnip_f64_t y) {
  return catnip_math_fmod(x, y);
}




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

  catnip_hstring *str = catnip_numconv_stringify_f64(nth);
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

void CATNIP_EXPORT(catnip_hstring_deref)(catnip_hstring *string) {
  catnip_hstring_deref(string);
}

void CATNIP_EXPORT(catnip_hstring_ref)(catnip_hstring *string) {
  catnip_hstring_ref(string);
}

catnip_hstring *CATNIP_EXPORT(catnip_numconv_stringify_f64)(catnip_f64_t value) {
  return catnip_numconv_stringify_f64(value);
}

catnip_f64_t CATNIP_EXPORT(catnip_numconv_parse_and_deref)(catnip_hstring *str) {
  catnip_f64_t val = catnip_numconv_parse(str);
  catnip_hstring_deref(str);
  return val;
}

catnip_runtime *CATNIP_EXPORT(catnip_runtime_new)() {
  return catnip_runtime_new();
}

void CATNIP_EXPORT(catnip_runtime_tick)(catnip_runtime *runtime) {
  catnip_runtime_tick(runtime);
}

catnip_target *CATNIP_EXPORT(catnip_target_new)(catnip_runtime *runtime, catnip_sprite *sprite) {
  return catnip_target_new(runtime, sprite);
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

void CATNIP_EXPORT(catnip_thread_resize_stack)(catnip_thread *thread, catnip_ui32_t extraCapacity) {
  catnip_thread_resize_stack(thread, extraCapacity);
}

// void CATNIP_EXPORT(stringify)(catnip_f64_t n) {
//   catnip_hstring_print(catnip_numconv_stringify_f64(n));
// }

// catnip_f64_t CATNIP_EXPORT(parse)(const char* string) {
//   catnip_util_print(string);
//   return catnip_numconv_parse(catnip_hstring_new_from_cstring(string));
// }

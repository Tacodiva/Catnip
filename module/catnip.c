
#include "catnip_hstring.c"
#include "catnip_list.c"
#include "catnip_mem.c"
#include "catnip_numconv.c"
#include "catnip_runtime.c"
#include "catnip_target.c"
#include "catnip_thread.c"
#include "catnip_unicode.c"
#include "catnip_util.c"
#include "catnip_blockutil.c"

void CATNIP_EXPORT(main)(catnip_runtime *runtime) {
  catnip_util_print("Enumerating sprites");

  for (catnip_ui32_t spriteIdx = 0; spriteIdx < runtime->sprite_count; spriteIdx++) {
    catnip_sprite *sprite = runtime->sprites[spriteIdx];
    catnip_util_print("Sprite:");

    catnip_hstring_print(sprite->name);
    catnip_util_print("Variables:");

    for (catnip_ui32_t varIdx = 0; varIdx < sprite->variable_count; varIdx++) {
      catnip_variable *variable = sprite->variables[varIdx];
      catnip_hstring_print(variable->name);

      if (variable->default_value.flags & CATNIP_VALUE_FLAG_STRING) {
        catnip_hstring_print(variable->default_value.val_string);
      } else {
        catnip_hstring *valueString = catnip_numconv_stringify(variable->default_value.val_double);
        catnip_hstring_print(valueString);
        catnip_hstring_deref(valueString);
      }
    }
  }
}

void *CATNIP_EXPORT(catnip_mem_alloc)(catnip_ui32_t length, catnip_bool_t zero) {
  void* ptr = catnip_mem_alloc(length);
  if (zero) catnip_mem_zero(ptr, length);
  return ptr;
}

void CATNIP_EXPORT(catnip_mem_free)(void *ptr) {
  catnip_mem_free(ptr);
}

void CATNIP_EXPORT(catnip_hstring_deref)(catnip_hstring *string) {
  catnip_hstring_deref(string);
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

void CATNIP_EXPORT(catnip_thread_terminate)(catnip_thread* thread) {
  return catnip_thread_terminate(thread);
}

void CATNIP_EXPORT(catnip_blockutil_debug_log)(catnip_hstring *str) {
  catnip_blockutil_debug_log(str);
}

void CATNIP_EXPORT(catnip_thread_resize_stack)(catnip_thread *thread, catnip_ui32_t extraCapacity) {
  catnip_thread_resize_stack(thread, extraCapacity);
}


// void CATNIP_EXPORT(stringify)(catnip_f64_t n) {
//   catnip_hstring_print(catnip_numconv_stringify(n));
// }

// catnip_f64_t CATNIP_EXPORT(parse)(const char* string) {
//   catnip_util_print(string);
//   return catnip_numconv_parse(catnip_hstring_new_from_cstring(string));
// }

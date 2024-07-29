#include "./catnip.h"

#if CATNIP_DEBUG
void catnip_assert(catnip_bool_t assertion, const char* name, const char* func, const char* file) {
    if (!assertion) {
        catnip_util_print("Assertion failed!");
        catnip_hstring_print(catnip_hstring_new_from_cstring(name));
        catnip_hstring_print(catnip_hstring_new_from_cstring(func));
        catnip_hstring_print(catnip_hstring_new_from_cstring(file));
        __builtin_trap();
    }
}
#endif
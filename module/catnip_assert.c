#include "./catnip.h"

#ifdef CATNIP_DEBUG
void catnip_assert(catnip_bool_t assertion, const char* name, const char* func, const char* file, const catnip_ui32_t line) {
    if (!assertion) {
        catnip_util_print("Assertion failed!");
        catnip_util_print(name);
        catnip_util_print(func);
        catnip_util_print(file);
        catnip_util_print_int(line);
        __builtin_trap();
    }
}
#endif
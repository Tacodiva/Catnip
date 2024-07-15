#ifndef CATNIP_VALUE_H_INCLUDED
#define CATNIP_VALUE_H_INCLUDED

#include "./catnip.h"

typedef catnip_ui32_t catnip_value_flags;

#define CATNIP_VALUE_FLAG(n) ((catnip_value_flags) 1 << (n))

#define CATNIP_VALUE_FLAG_STRING CATNIP_VALUE_FLAG(0)
#define CATNIP_VALUE_FLAG_DOUBLE CATNIP_VALUE_FLAG(1)

struct catnip_value {
    catnip_value_flags flags;
    catnip_hstring *val_string;
    catnip_f64_t val_double;
};

typedef struct catnip_value catnip_value;


#endif
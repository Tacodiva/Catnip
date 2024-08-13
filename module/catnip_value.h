#ifndef CATNIP_VALUE_H_INCLUDED
#define CATNIP_VALUE_H_INCLUDED

#include "./catnip.h"

typedef catnip_ui32_t catnip_value_flags;

#define CATNIP_VALUE_FLAG(n) ((catnip_value_flags) 1 << (n))

#define CATNIP_VALUE_FLAG_STRING CATNIP_VALUE_FLAG(0)
#define CATNIP_VALUE_FLAG_DOUBLE CATNIP_VALUE_FLAG(1)

struct catnip_value_parts
{
    catnip_i32_t upper;
    catnip_i32_t lower;
};

typedef struct catnip_value_parts catnip_value_parts;

union catnip_value {
    catnip_f64_t val_double;
    struct catnip_value_parts parts;
};

typedef union catnip_value catnip_value;


#endif
#ifndef CATNIP_VALUE_H_INCLUDED
#define CATNIP_VALUE_H_INCLUDED

#include "./catnip.h"

typedef catnip_ui32_t catnip_value_flags;

#define CATNIP_VALUE_FLAG(n) ((catnip_value_flags) 1 << (n))

#define CATNIP_VALUE_FLAG_STRING CATNIP_VALUE_FLAG(0)
#define CATNIP_VALUE_FLAG_DOUBLE CATNIP_VALUE_FLAG(1)


// All exponent bits + significand bit #52
#define CATINP_VALUE_CANNON_NAN_UPPER 0x7FF80000
// All exponent bits + significand bit #52 + significand bit #33
#define CATINP_VALUE_STRING_UPPER 0x7FF80001
// All exponent bits + significand bit #52 + significand bit #33
#define CATINP_VALUE_STRING_MASK 0x7FF8000100000000

#define CATNIP_VALUE_IS_STRING(value) ( (value).parts.upper == CATINP_VALUE_STRING_UPPER )
#define CATNIP_VALUE_AS_NUMBER(value) ( (value).val_double )
#define CATNIP_VALUE_AS_STRING(value) ( (catnip_hstring *) (value).parts.lower )

#define CATNIP_VALUE_FROM_F64(value) ( *(catnip_value *) &(value) )

struct catnip_value_parts
{
    catnip_ui32_t lower;
    catnip_ui32_t upper;
};

typedef struct catnip_value_parts catnip_value_parts;

union catnip_value {
    catnip_f64_t val_double;
    struct catnip_value_parts parts;
};

typedef union catnip_value catnip_value;

catnip_f64_t catnip_value_to_number(catnip_runtime *runtime, catnip_value value);
catnip_hstring *catnip_value_to_string(catnip_runtime *runtime, catnip_value value);

#endif
#ifndef CATNIP_MATH_H_INCLUDED
#define CATNIP_MATH_H_INCLUDED

#include "./catnip.h"

#define CATNIP_F64_INFINITY __builtin_inf()
#define CATNIP_F64_PI (3.141592653589793)
#define CATNIP_F64_NAN __builtin_nan("")
#define CATNIP_F64_ISNAN(x) __builtin_isnan(x)
#define CATNIP_F64_ISINFINITE(x) __builtin_isinf(x)
#define CATNIP_F64_SIGNBIT(x) __builtin_signbit(x)
#define CATNIP_F64_SQRT(x) __builtin_sqrt(x)
#define CATNIP_F64_FLOOR(x) __builtin_floor(x)
#define CATNIP_F64_ABS(x) __builtin_fabs(x)

#define CATNIP_F32_ISNAN(x) __builtin_isnan(x)
#define CATNIP_F32_SQRT(x) __builtin_sqrt(x)
#define CATNIP_F32_FLOOR(x) __builtin_floor(x)

#define CATNIP_MAX(a,b) \
({ __typeof__ (a) _a = (a); \
    __typeof__ (b) _b = (b); \
    _a > _b ? _a : _b; })

#define CATNIP_MIN(a,b) \
({ __typeof__ (a) _a = (a); \
    __typeof__ (b) _b = (b); \
    _a < _b ? _a : _b; })

catnip_f64_t catnip_math_fmod(catnip_f64_t x, catnip_f64_t y);
catnip_f64_t catnip_math_round(catnip_f64_t x);
catnip_f64_t catnip_math_random(catnip_runtime *runtime);
catnip_f64_t catnip_math_log(catnip_f64_t x);
catnip_f64_t catnip_math_exp(catnip_f64_t x);
catnip_f64_t catnip_math_pow(catnip_f64_t x, catnip_f64_t y);
catnip_f64_t catnip_math_sin(catnip_f64_t x);
catnip_f64_t catnip_math_cos(catnip_f64_t x);
catnip_f64_t catnip_math_tan(catnip_f64_t x);
catnip_f64_t catnip_math_atan(catnip_f64_t x);


struct catnip_math_random_state {
    catnip_ui64_t state0;
    catnip_ui64_t state1;
};

#endif
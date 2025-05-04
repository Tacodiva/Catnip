#ifndef CATNIP_MATH_MUSL_H_INCLUDED
#define CATNIP_MATH_MUSL_H_INCLUDED

#include "../catnip.h"

/*
 * This file contains stuff I stole from musl (https://github.com/bpowers/musl) that's used by multiple
 *   files which implement our math functions.
 */

#define FORCE_EVAL(x)

// Epsilon
#define EPS 1.0842021724855044340e-19L


catnip_i32_t __rem_pio2(catnip_f64_t x, catnip_f64_t *y);
catnip_i32_t __rem_pio2_large(catnip_f64_t *x, catnip_f64_t *y, catnip_i32_t e0, catnip_i32_t nx, catnip_i32_t prec);
catnip_f64_t scalbn(catnip_f64_t x, catnip_i32_t n);

catnip_f64_t __sin(catnip_f64_t x, catnip_f64_t y, catnip_i32_t iy);
catnip_f64_t __cos(catnip_f64_t x, catnip_f64_t y);

// https://github.com/bpowers/musl/blob/94cb2ec2a0ffcb47d24dbf7a30e462505396cf54/src/internal/libm.h#L76

/* Get two 32 bit ints from a double.  */
#define EXTRACT_WORDS(hi,lo,d)                    \
do {                                              \
  union {catnip_f64_t f; catnip_i64_t i;} __u;    \
  __u.f = (d);                                    \
  (hi) = __u.i >> 32;                             \
  (lo) = (catnip_ui32_t)__u.i;                         \
} while (0)

/* Get the more significant 32 bit int from a double.  */
#define GET_HIGH_WORD(hi,d)                       \
do {                                              \
  union {catnip_f64_t f; catnip_i64_t i;} __u;    \
  __u.f = (d);                                    \
  (hi) = __u.i >> 32;                             \
} while (0)

/* Get the less significant 32 bit int from a double.  */
#define GET_LOW_WORD(lo,d)                        \
do {                                              \
  union {catnip_f64_t f; catnip_i64_t i;} __u;    \
  __u.f = (d);                                    \
  (lo) = (catnip_ui32_t)__u.i;                         \
} while (0)

/* Set a catnip_f64_t from two 32 bit ints.  */
#define INSERT_WORDS(d,hi,lo)                     \
do {                                              \
  union {catnip_f64_t f; catnip_i64_t i;} __u;    \
  __u.i = ((catnip_ui64_t)(hi)<<32) | (catnip_ui32_t)(lo);  \
  (d) = __u.f;                                    \
} while (0)

/* Set the more significant 32 bits of a catnip_f64_t from an int.  */
#define SET_HIGH_WORD(d,hi)                       \
do {                                              \
  union {catnip_f64_t f; catnip_i64_t i;} __u;    \
  __u.f = (d);                                    \
  __u.i &= 0xffffffff;                            \
  __u.i |= (catnip_ui64_t)(hi) << 32;                  \
  (d) = __u.f;                                    \
} while (0)

/* Set the less significant 32 bits of a catnip_f64_t from an int.  */
#define SET_LOW_WORD(d,lo)                        \
do {                                              \
  union {catnip_f64_t f; catnip_i64_t i;} __u;    \
  __u.f = (d);                                    \
  __u.i &= 0xffffffff00000000ull;                 \
  __u.i |= (catnip_ui32_t)(lo);                        \
  (d) = __u.f;                                    \
} while (0)

static const catnip_f64_t
half[2] = {0.5,-0.5},
bp[]   = {1.0, 1.5,},
dp_h[] = { 0.0, 5.84962487220764160156e-01,}, /* 0x3FE2B803, 0x40000000 */
dp_l[] = { 0.0, 1.35003920212974897128e-08,}, /* 0x3E4CFDEB, 0x43CFD006 */
two53  =  9007199254740992.0, /* 0x43400000, 0x00000000 */
huge   =  1.0e300,
tiny   =  1.0e-300,
/* poly coefs for (3/2)*(log(x)-2s-2/3*s**3 */
L1 =  5.99999999999994648725e-01, /* 0x3FE33333, 0x33333303 */
L2 =  4.28571428578550184252e-01, /* 0x3FDB6DB6, 0xDB6FABFF */
L3 =  3.33333329818377432918e-01, /* 0x3FD55555, 0x518F264D */
L4 =  2.72728123808534006489e-01, /* 0x3FD17460, 0xA91D4101 */
L5 =  2.30660745775561754067e-01, /* 0x3FCD864A, 0x93C9DB65 */
L6 =  2.06975017800338417784e-01, /* 0x3FCA7E28, 0x4A454EEF */
P1 =  1.66666666666666019037e-01, /* 0x3FC55555, 0x5555553E */
P2 = -2.77777777770155933842e-03, /* 0xBF66C16C, 0x16BEBD93 */
P3 =  6.61375632143793436117e-05, /* 0x3F11566A, 0xAF25DE2C */
P4 = -1.65339022054652515390e-06, /* 0xBEBBBD41, 0xC5D26BF1 */
P5 =  4.13813679705723846039e-08, /* 0x3E663769, 0x72BEA4D0 */
lg2     =  6.93147180559945286227e-01, /* 0x3FE62E42, 0xFEFA39EF */
lg2_h   =  6.93147182464599609375e-01, /* 0x3FE62E43, 0x00000000 */
lg2_l   = -1.90465429995776804525e-09, /* 0xBE205C61, 0x0CA86C39 */
ovt     =  8.0085662595372944372e-017, /* -(1024-log2(ovfl+.5ulp)) */
cp      =  9.61796693925975554329e-01, /* 0x3FEEC709, 0xDC3A03FD =2/(3ln2) */
cp_h    =  9.61796700954437255859e-01, /* 0x3FEEC709, 0xE0000000 =(float)cp */
cp_l    = -7.02846165095275826516e-09, /* 0xBE3E2FE0, 0x145B01F5 =tail of cp_h*/
ivln2   =  1.44269504088896338700e+00, /* 0x3FF71547, 0x652B82FE =1/ln2 */
ivln2_h =  1.44269502162933349609e+00, /* 0x3FF71547, 0x60000000 =24b 1/ln2*/
ivln2_l =  1.92596299112661746887e-08, /* 0x3E54AE0B, 0xF85DDF44 =1/ln2 tail*/
ln2hi = 6.93147180369123816490e-01, /* 0x3fe62e42, 0xfee00000 */
ln2lo = 1.90821492927058770002e-10; /* 0x3dea39ef, 0x35793c76 */

#endif
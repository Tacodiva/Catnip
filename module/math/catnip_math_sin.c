#include "./catnip_math_musl.h"

/* origin: FreeBSD /usr/src/lib/msun/src/s_sin.c */
/*
 * ====================================================
 * Copyright (C) 1993 by Sun Microsystems, Inc. All rights reserved.
 *
 * Developed at SunPro, a Sun Microsystems, Inc. business.
 * Permission to use, copy, modify, and distribute this
 * software is freely granted, provided that this notice
 * is preserved.
 * ====================================================
 */

static const catnip_f64_t
S1  = -1.66666666666666324348e-01, /* 0xBFC55555, 0x55555549 */
S2  =  8.33333333332248946124e-03, /* 0x3F811111, 0x1110F8A6 */
S3  = -1.98412698298579493134e-04, /* 0xBF2A01A0, 0x19C161D5 */
S4  =  2.75573137070700676789e-06, /* 0x3EC71DE3, 0x57B1FE7D */
S5  = -2.50507602534068634195e-08, /* 0xBE5AE5E6, 0x8A2B9CEB */
S6  =  1.58969099521155010221e-10; /* 0x3DE5D93A, 0x5ACFD57C */

// https://github.com/bpowers/musl/blob/94cb2ec2a0ffcb47d24dbf7a30e462505396cf54/src/math/__sin.c#L52
catnip_f64_t __sin(catnip_f64_t x, catnip_f64_t y, catnip_i32_t iy)
{
	catnip_f64_t z,r,v,w;

	z = x*x;
	w = z*z;
	r = S2 + z*(S3 + z*S4) + z*w*(S5 + z*S6);
	v = z*x;
	if (iy == 0)
		return x + v*(S1 + z*r);
	else
		return x - ((z*(0.5*y - v*r) - y) - v*S1);
}

// https://github.com/bpowers/musl/blob/94cb2ec2a0ffcb47d24dbf7a30e462505396cf54/src/math/sin.c#L45
catnip_f64_t catnip_math_sin(catnip_f64_t x)
{
	catnip_f64_t y[2];
	catnip_ui32_t ix;
	catnip_ui32_t n;

	/* High word of x. */
	GET_HIGH_WORD(ix, x);
	ix &= 0x7fffffff;

	/* |x| ~< pi/4 */
	if (ix <= 0x3fe921fb) {
		if (ix < 0x3e500000) {  /* |x| < 2**-26 */
			/* raise inexact if x != 0 and underflow if subnormal*/
			FORCE_EVAL(ix < 0x00100000 ? x/0x1p120f : x+0x1p120f);
			return x;
		}
		return __sin(x, 0.0, 0);
	}

	/* sin(Inf or NaN) is NaN */
	if (ix >= 0x7ff00000)
		return x - x;

	/* argument reduction needed */
	n = __rem_pio2(x, y);
	switch (n&3) {
	case 0: return  __sin(y[0], y[1], 1);
	case 1: return  __cos(y[0], y[1]);
	case 2: return -__sin(y[0], y[1], 1);
	default:
		return -__cos(y[0], y[1]);
	}
}
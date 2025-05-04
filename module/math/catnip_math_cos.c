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
C1  =  4.16666666666666019037e-02, /* 0x3FA55555, 0x5555554C */
C2  = -1.38888888888741095749e-03, /* 0xBF56C16C, 0x16C15177 */
C3  =  2.48015872894767294178e-05, /* 0x3EFA01A0, 0x19CB1590 */
C4  = -2.75573143513906633035e-07, /* 0xBE927E4F, 0x809C52AD */
C5  =  2.08757232129817482790e-09, /* 0x3E21EE9E, 0xBDB4B1C4 */
C6  = -1.13596475577881948265e-11; /* 0xBDA8FAE9, 0xBE8838D4 */

// https://github.com/bpowers/musl/blob/94cb2ec2a0ffcb47d24dbf7a30e462505396cf54/src/math/__cos.c#L61
catnip_f64_t __cos(catnip_f64_t x, catnip_f64_t y)
{
	catnip_f64_t hz,z,r,w;

	z  = x*x;
	w  = z*z;
	r  = z*(C1+z*(C2+z*C3)) + w*w*(C4+z*(C5+z*C6));
	hz = 0.5*z;
	w  = 1.0-hz;
	return w + (((1.0-w)-hz) + (z*r-x*y));
}

// https://github.com/bpowers/musl/blob/94cb2ec2a0ffcb47d24dbf7a30e462505396cf54/src/math/cos.c#L45
catnip_f64_t catnip_math_cos(catnip_f64_t x)
{
	catnip_f64_t y[2];
	catnip_ui32_t ix;
	catnip_ui32_t n;

	GET_HIGH_WORD(ix, x);
	ix &= 0x7fffffff;

	/* |x| ~< pi/4 */
	if (ix <= 0x3fe921fb) {
		if (ix < 0x3e46a09e) {  /* |x| < 2**-27 * sqrt(2) */
			/* raise inexact if x!=0 */
			FORCE_EVAL(x + 0x1p120f);
			return 1.0;
		}
		return __cos(x, 0);
	}

	/* cos(Inf or NaN) is NaN */
	if (ix >= 0x7ff00000)
		return x-x;

	/* argument reduction */
	n = __rem_pio2(x, y);
	switch (n&3) {
	case 0: return  __cos(y[0], y[1]);
	case 1: return -__sin(y[0], y[1], 1);
	case 2: return -__cos(y[0], y[1]);
	default:
		return  __sin(y[0], y[1], 1);
	}
}
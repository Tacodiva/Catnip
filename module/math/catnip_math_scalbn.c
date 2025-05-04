#include "./catnip_math_musl.h"

// https://github.com/bpowers/musl/blob/94cb2ec2a0ffcb47d24dbf7a30e462505396cf54/src/math/scalbn.c#L4
catnip_f64_t scalbn(catnip_f64_t x, catnip_i32_t n)
{
	union {catnip_f64_t f; catnip_ui64_t i;} u;
	catnip_f64_t y = x;

	if (n > 1023) {
		y *= 0x1p1023;
		n -= 1023;
		if (n > 1023) {
			y *= 0x1p1023;
			n -= 1023;
			if (n > 1023)
				n = 1023;
		}
	} else if (n < -1022) {
		y *= 0x1p-1022;
		n += 1022;
		if (n < -1022) {
			y *= 0x1p-1022;
			n += 1022;
			if (n < -1022)
				n = -1022;
		}
	}
	u.i = (catnip_ui64_t)(0x3ff+n)<<52;
	x = y * u.f;
	return x;
}
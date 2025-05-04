#include "./catnip_math_musl.h"

catnip_f64_t catnip_math_fmod(catnip_f64_t x, catnip_f64_t y)
{
	union {catnip_f64_t f; catnip_ui64_t i;} ux = {x}, uy = {y};
	catnip_i32_t ex = ux.i>>52 & 0x7ff;
	catnip_i32_t ey = uy.i>>52 & 0x7ff;
	catnip_i32_t sx = ux.i>>63;
	catnip_ui64_t i;

	/* in the followings uxi should be ux.i, but then gcc wrongly adds */
	/* float load/store to inner loops ruining performance and code size */
	catnip_ui64_t uxi = ux.i;

	if (uy.i<<1 == 0 || CATNIP_F64_ISNAN(y) || ex == 0x7ff)
		return (x*y)/(x*y);
	if (uxi<<1 <= uy.i<<1) {
		if (uxi<<1 == uy.i<<1)
			return 0*x;
		return x;
	}

	/* normalize x and y */
	if (!ex) {
		for (i = uxi<<12; i>>63 == 0; ex--, i <<= 1);
		uxi <<= -ex + 1;
	} else {
		uxi &= -1ULL >> 12;
		uxi |= 1ULL << 52;
	}
	if (!ey) {
		for (i = uy.i<<12; i>>63 == 0; ey--, i <<= 1);
		uy.i <<= -ey + 1;
	} else {
		uy.i &= -1ULL >> 12;
		uy.i |= 1ULL << 52;
	}

	/* x mod y */
	for (; ex > ey; ex--) {
		i = uxi - uy.i;
		if (i >> 63 == 0) {
			if (i == 0)
				return 0*x;
			uxi = i;
		}
		uxi <<= 1;
	}
	i = uxi - uy.i;
	if (i >> 63 == 0) {
		if (i == 0)
			return 0*x;
		uxi = i;
	}
	for (; uxi>>52 == 0; uxi <<= 1, ex--);

	/* scale result */
	if (ex > 0) {
		uxi -= 1ULL << 52;
		uxi |= (catnip_ui64_t)ex << 52;
	} else {
		uxi >>= -ex + 1;
	}
	uxi |= (catnip_ui64_t)sx << 63;
	ux.i = uxi;
	return ux.f;
}


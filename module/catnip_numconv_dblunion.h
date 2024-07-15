
#include "./catnip.h"

/*
 * This entire file is pretty much copied from
 * https://github.com/svaarala/duktape/blob/50af773b1b32067170786c2b7c661705ec7425d4/src-input/duk_numconv.c
 */

union catnip_double_union {
  catnip_f64_t d;
  catnip_f32_t f[2];
  catnip_ui64_t ull[1];
  catnip_ui32_t ui[2];
  catnip_ui16_t us[4];
  catnip_uchar_t uc[8];
};

typedef union catnip_double_union catnip_double_union;

#define CATNIP_DBLUNION_SET_DOUBLE(u, v) \
	do { \
		(u)->d = (v); \
	} while (0)

#define CATNIP_DBLUNION_SET_HIGH32(u, v) \
	do { \
		(u)->ui[1] = (catnip_ui32_t) (v); \
	} while (0)

#define CATNIP_DBLUNION_SET_HIGH32_ZERO_LOW32(u, v) \
	do { \
		(u)->ull[0] = ((catnip_ui64_t) (v)) << 32; \
	} while (0)

#define CATNIP_DBLUNION_SET_LOW32(u, v) \
	do { \
		(u)->ui[0] = (catnip_ui32_t) (v); \
	} while (0)

#define CATNIP_DBLUNION_GET_DOUBLE(u) ((u)->d)
#define CATNIP_DBLUNION_GET_HIGH32(u) ((u)->ui[1])
#define CATNIP_DBLUNION_GET_LOW32(u)  ((u)->ui[0])

#define CATNIP_DBLUNION_SET_UINT64(u, v) \
	do { \
		(u)->ull[0] = (catnip_ui64_t) (v); \
	} while (0)
#define CATNIP_DBLUNION_GET_UINT64(u) ((u)->ull[0])

#define CATNIP_DBLUNION_SET_INT64(u, v) CATNIP_DBLUNION_SET_UINT64((u), (catnip_ui64_t) (v))
#define CATNIP_DBLUNION_GET_INT64(u)    ((catnip_i64_t) CATNIP_DBLUNION_GET_UINT64((u)))
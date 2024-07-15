#include "./catnip.h"

/*
 * This entire file is pretty much copied from
 * https://github.com/svaarala/duktape/blob/50af773b1b32067170786c2b7c661705ec7425d4/src-input/duk_numconv.c
 */

#define CATNIP_BIGINT_MAX_PARTS 37

typedef struct {
  catnip_i32_t n;
  catnip_ui32_t v[CATNIP_BIGINT_MAX_PARTS];
} catnip_bigint;

#define CATNIP_ASSERT_BIGINT_VALID(x) CATNIP_ASSERT(catnip_bigint_is_valid(x))

catnip_bool_t catnip_bigint_is_valid(catnip_bigint *x) {
  return (((x->n >= 0) && (x->n <= CATNIP_BIGINT_MAX_PARTS)) &&
          ((x->n == 0) || (x->v[x->n - 1] != 0)));
}

void catnip_bigint_normalize(catnip_bigint *x) {
  catnip_i32_t i;

  for (i = x->n - 1; i >= 0; i--) {
    if (x->v[i] != 0) {
      break;
    }
  }

  x->n = i + 1;
  CATNIP_ASSERT_BIGINT_VALID(x);
}

void catnip_bigint_copy(catnip_bigint *dst, catnip_bigint *src) {
  dst->n = src->n;
  catnip_mem_copy(dst->v, src->v, sizeof(catnip_ui32_t) * src->n);
}

void catnip_bigint_set_small(catnip_bigint *x, catnip_ui32_t v) {
  if (v == 0) {
    x->n = 0;
  } else {
    x->n = 1;
    x->v[0] = v;
  }
  CATNIP_ASSERT_BIGINT_VALID(x);
}

catnip_i32_t catnip_bigint_compare(catnip_bigint *x, catnip_bigint *y) {
  CATNIP_ASSERT_BIGINT_VALID(x);
  CATNIP_ASSERT_BIGINT_VALID(y);

  catnip_i32_t nx = x->n;
  catnip_i32_t ny = y->n;

  if (nx > ny)
    return 1;
  if (nx < ny)
    return -1;

  for (catnip_i32_t i = nx - 1; i >= 0; i--) {
    catnip_ui32_t tx = x->v[i];
    catnip_ui32_t ty = y->v[i];

    if (tx > ty)
      return 1;
    if (tx < ty)
      return -1;
  }

  return 0;
}

void catnip_bigint_add(catnip_bigint *result, catnip_bigint *y,
                       catnip_bigint *z) {
  CATNIP_ASSERT_BIGINT_VALID(y);
  CATNIP_ASSERT_BIGINT_VALID(z);

  if (z->n > y->n) {
    catnip_bigint *t;
    t = y;
    y = z;
    z = t;
  }
  CATNIP_ASSERT(y->n >= z->n);

  catnip_i32_t ny = y->n;
  catnip_i32_t nz = z->n;
  catnip_ui64_t tmp = 0;

  catnip_i32_t i;

  for (i = 0; i < ny; i++) {
    CATNIP_ASSERT(i < CATNIP_BIGINT_MAX_PARTS);
    tmp += y->v[i];
    if (i < nz) {
      tmp += z->v[i];
    }
    result->v[i] = (catnip_ui32_t)(tmp & 0xffffffffUL);
    tmp = tmp >> 32;
  }

  if (tmp != 0) {
    CATNIP_ASSERT(i < CATNIP_BIGINT_MAX_PARTS);
    result->v[i++] = (catnip_ui32_t)tmp;
  }
  result->n = i;

  CATNIP_ASSERT_BIGINT_VALID(result);
}

void catnip_bigint_add_small(catnip_bigint *result, catnip_bigint *y,
                             catnip_ui32_t z) {
  CATNIP_ASSERT_BIGINT_VALID(y);

  /* XXX: this could be optimized; there is only one call site now though */
  catnip_bigint tmp;
  catnip_bigint_set_small(&tmp, z);
  catnip_bigint_add(result, y, &tmp);
}

void catnip_bigint_add_copy(catnip_bigint *x, catnip_bigint *y,
                            catnip_bigint *t) {
  catnip_bigint_add(t, x, y);
  catnip_bigint_copy(x, t);
}

// x <- y - z
void catnip_bigint_sub(catnip_bigint *x, catnip_bigint *y, catnip_bigint *z) {
  CATNIP_ASSERT_BIGINT_VALID(y);
  CATNIP_ASSERT_BIGINT_VALID(z);
  CATNIP_ASSERT(catnip_bigint_compare(y, z) >= 0);
  CATNIP_ASSERT(y->n >= z->n);

  catnip_i32_t ny = y->n;
  catnip_i32_t nz = z->n;
  catnip_i64_t tmp = 0;
  catnip_i32_t i;

  for (i = 0; i < ny; i++) {
    catnip_ui32_t ty = y->v[i];
    catnip_ui32_t tz = 0;

    if (i < nz) {
      tz = z->v[i];
    }

    tmp = (catnip_i64_t)ty - (catnip_i64_t)tz + tmp;
    x->v[i] = (catnip_ui32_t)((catnip_ui64_t)tmp & 0xffffffffUL);
    tmp = tmp >> 32;
  }
  CATNIP_ASSERT(tmp == 0);

  x->n = i;
  catnip_bigint_normalize(x);
}

void catnip_bigint_sub_copy(catnip_bigint *x, catnip_bigint *y,
                            catnip_bigint *t) {
  catnip_bigint_sub(t, x, y);
  catnip_bigint_copy(x, t);
}

// x <- y * z
void catnip_bigint_mul(catnip_bigint *x, catnip_bigint *y, catnip_bigint *z) {
  CATNIP_ASSERT_BIGINT_VALID(y);
  CATNIP_ASSERT_BIGINT_VALID(z);

  catnip_i32_t nx = y->n + z->n; // max possible
  CATNIP_ASSERT(nx <= CATNIP_BIGINT_MAX_PARTS);

  if (nx == 0) {
    x->n = 0;
    return;
  }

  catnip_mem_zero(x->v, sizeof(catnip_ui32_t) * nx);
  x->n = nx;
  catnip_i32_t nz = z->n;

  for (catnip_i32_t i = 0; i < y->n; i++) {
    catnip_ui64_t tmp = 0;
    catnip_i32_t j;

    for (j = 0; j < nz; j++) {
      tmp += (catnip_ui64_t)y->v[i] * (catnip_ui64_t)z->v[j] + x->v[i + j];
      x->v[i + j] = (catnip_ui32_t)(tmp & 0xffffffffUL);
      tmp = tmp >> 32;
    }
    if (tmp > 0) {
      CATNIP_ASSERT(i + j < nx);
      CATNIP_ASSERT(i + j < CATNIP_BIGINT_MAX_PARTS);
      CATNIP_ASSERT(x->v[i + j] == 0U);
      x->v[i + j] = (catnip_ui32_t)tmp;
    }
  }

  catnip_bigint_normalize(x);
}

void catnip_bigint_mul_small(catnip_bigint *result, catnip_bigint *y,
                             catnip_ui32_t z) {
  CATNIP_ASSERT_BIGINT_VALID(y);

  /* XXX: this could be optimized */
  catnip_bigint tmp;
  catnip_bigint_set_small(&tmp, z);
  catnip_bigint_mul(result, y, &tmp);
}

catnip_bool_t catnip_bigint_is_even(catnip_bigint *x) {
  CATNIP_ASSERT_BIGINT_VALID(x);
  return (x->n == 0) || ((x->v[0] & 0x01) == 0);
}

catnip_bool_t catnip_bigint_is_zero(catnip_bigint *x) {
  CATNIP_ASSERT_BIGINT_VALID(x);
  return (x->n == 0);
}

/* Bigint is 2^52.  Used to detect normalized IEEE double mantissa values
 * which are at the lowest edge (next floating point value downwards has
 * a different exponent).  The lowest mantissa has the form:
 *
 *     1000........000    (52 zeroes; only "hidden bit" is set)
 */
catnip_bool_t catnip_bigint_is_2to52(catnip_bigint *x) {
  CATNIP_ASSERT_BIGINT_VALID(x);
  return (x->n == 2) && (x->v[0] == 0) && (x->v[1] == (1 << (52 - 32)));
}

void catnip_bigint_2exp(catnip_bigint *result, catnip_i32_t y) {
  catnip_i32_t n = (y / 32) + 1;
  CATNIP_ASSERT(n > 0);
  catnip_i32_t r = y % 32;
  catnip_mem_zero(result->v, sizeof(catnip_ui32_t) * n);
  result->n = n;
  result->v[n - 1] = (((catnip_ui32_t)1) << r);
  CATNIP_ASSERT_BIGINT_VALID(result);
}

void catnip_bigint_mul_copy(catnip_bigint *x, catnip_bigint *y,
                            catnip_bigint *t) {
  catnip_bigint_mul(t, x, y);
  catnip_bigint_copy(x, t);
}

void catnip_bigint_mul_small_copy(catnip_bigint *x, catnip_ui32_t y,
                            catnip_bigint *t) {
  catnip_bigint_mul_small(t, x, y);
  catnip_bigint_copy(x, t);
}

void catnip_bigint_exp_small(catnip_bigint *x, catnip_i32_t b, catnip_i32_t y,
                             catnip_bigint *t1, catnip_bigint *t2) {
  CATNIP_ASSERT(x != t1 && x != t2 && t1 != t2);
  CATNIP_ASSERT(b >= 0);
  CATNIP_ASSERT(y >= 0);

  if (b == 2) {
    catnip_bigint_2exp(x, y);
    return;
  }
  /* http://en.wikipedia.org/wiki/Exponentiation_by_squaring */

  catnip_bigint_set_small(x, 1);
  catnip_bigint_set_small(t1, (catnip_ui32_t)b);

  for (;;) {
    /* Loop structure ensures that we don't compute t1^2 unnecessarily
     * on the final round, as that might create a bignum exceeding the
     * current CATNIP_BIGING_MAX_PARTS limit.
     */

    if (y & 0x01) {
      catnip_bigint_mul_copy(x, t1, t2);
    }
    y = y >> 1;
    if (y == 0)
      break;
    catnip_bigint_mul_copy(t1, t1, t2);
  }
}

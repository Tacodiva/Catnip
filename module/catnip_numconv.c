#include "./catnip.h"
#include "./catnip_numconv_bigint.c"
#include "./catnip_numconv_dblunion.h"

/*
 * This entire file is pretty much copied from
 * https://github.com/svaarala/duktape/blob/50af773b1b32067170786c2b7c661705ec7425d4/src-input/duk_numconv.c
 */

static const catnip_char_t catnip_numconv_digits[36] = {
    '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b',
    'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n',
    'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'};

static const catnip_uchar_t catnip_numconv_digits_for_radix[] = {
    69, 44, 35, 30, 27, 25, 23, 22, 20, 20, /* 2 to 11 */
    20, 19, 19, 18, 18, 17, 17, 17, 16, 16, /* 12 to 21 */
    16, 16, 16, 15, 15, 15, 15, 15, 15, 14, /* 22 to 31 */
    14, 14, 14, 14, 14                      /* 31 to 36 */
};

typedef struct {
  catnip_i16_t upper;
  catnip_i16_t lower;
} catnip_numconv_exp_limit;

static const catnip_numconv_exp_limit catnip_numconv_exp_limits[] = {
    {957, -1147},
    {605, -725},
    {479, -575},
    {414, -496},
    {372, -446},
    {342, -411},
    {321, -384},
    {304, -364},
    {291, -346},
    {279, -334},
    {268, -323},
    {260, -312},
    {252, -304},
    {247, -296},
    {240, -289},
    {236, -283},
    {231, -278},
    {227, -273},
    {223, -267},
    {220, -263},
    {216, -260},
    {213, -256},
    {210, -253},
    {208, -249},
    {205, -246},
    {203, -244},
    {201, -241},
    {198, -239},
    {196, -237},
    {195, -234},
    {193, -232},
    {191, -230},
    {190, -228},
    {188, -226},
    {187, -225},
};

#define CATNIP_NUMCONV_MAX_EXPONENT 10000000L

#define CATNIP_NUMCONV_IEEE_DOUBLE_EXP_BIAS 1023
#define CATNIP_NUMCONV_IEEE_DOUBLE_EXP_MIN (-1022)

#define CATNIP_NUMCONV_MAX_OUTPUT_DIGITS 1040
#define CATNIP_NUMCONV_MAX_FORMATTED_LENGTH 1040

#define CATNIP_NUMCONV_CTX_NUM_BIGINTS 7
#define CATNIP_NUMCONV_CTX_BIGINTS_SIZE \
  (sizeof(catnip_bigint) * CATNIP_NUMCONV_CTX_NUM_BIGINTS)

typedef struct {
  catnip_bigint f, r, s, mp, mm, t1, t2;

  catnip_bool_t is_s2n;
  catnip_bool_t is_fixed;
  catnip_i32_t req_digits;
  catnip_bool_t abs_pos;
  catnip_i32_t e; // exponent for 'f'
  catnip_i32_t b; // input radix
  catnip_i32_t B; // output radix

  catnip_i32_t k;
  catnip_bool_t low_ok;
  catnip_bool_t high_ok;
  catnip_bool_t unequal_gaps;

  catnip_uchar_t digits[CATNIP_NUMCONV_MAX_OUTPUT_DIGITS];
  catnip_i32_t count;
} catnip_numconv_stringify_ctx;

/* Note: computes with 'idx' in assertions, so caller beware.
 * 'idx' is preincremented, i.e. '1' on first call, because it
 * is more convenient for the caller.
 */
#define CATNIP_NUMCONV_DRAGON4_OUTPUT_PREINC(nc_ctx, preinc_idx, x)     \
  do {                                                                  \
    CATNIP_ASSERT((preinc_idx) - 1 >= 0);                               \
    CATNIP_ASSERT((preinc_idx) - 1 < CATNIP_NUMCONV_MAX_OUTPUT_DIGITS); \
    ((nc_ctx)->digits[(preinc_idx) - 1]) = (catnip_uchar_t)(x);         \
  } while (0)

static catnip_i32_t catnip_numconv_dragon4_format_uint32(catnip_uchar_t *buf,
                                                  catnip_ui32_t x,
                                                  catnip_i32_t radix) {
  CATNIP_ASSERT(buf != CATNIP_NULL);
  CATNIP_ASSERT(radix >= 2 && radix <= 36);

  /* A 32-bit unsigned integer formats to at most 32 digits (the
   * worst case happens with radix == 2).  Output the digits backwards,
   * and use a memmove() to get them in the right place.
   */

  catnip_uchar_t *p = buf + 32;

  for (;;) {
    catnip_ui32_t t = x / (catnip_ui32_t)radix;
    catnip_i32_t digit = (catnip_i32_t)(x - t * (catnip_ui32_t)radix);
    x = t;

    CATNIP_ASSERT(digit >= 0 && digit < 36);
    *(--p) = catnip_numconv_digits[digit];

    if (x == 0) {
      break;
    }
  }

  catnip_ui32_t len = (catnip_ui32_t)((buf + 32) - p);
  catnip_mem_move((void *)buf, p, len);

  return len;
}

static void catnip_numconv_dragon4_prepare(catnip_numconv_stringify_ctx *nc_ctx) {

  if (catnip_bigint_is_even(&nc_ctx->f)) {
    nc_ctx->low_ok = CATNIP_TRUE;
    nc_ctx->high_ok = CATNIP_TRUE;
  } else {
    nc_ctx->low_ok = CATNIP_FALSE;
    nc_ctx->high_ok = CATNIP_FALSE;
  }

  catnip_bool_t lowest_mantissa;

  if (nc_ctx->is_s2n) {
    lowest_mantissa = CATNIP_FALSE;
  } else {
    lowest_mantissa = catnip_bigint_is_2to52(&nc_ctx->f);
  }

  nc_ctx->unequal_gaps = CATNIP_FALSE;

  if (nc_ctx->e >= 0) {
    /* exponent non-negative (and thus not minimum exponent) */
    if (lowest_mantissa) {

      catnip_bigint_exp_small(&nc_ctx->mm, nc_ctx->b, nc_ctx->e, &nc_ctx->t1, &nc_ctx->t2); /* mm <- b^e */
      catnip_bigint_mul_small(&nc_ctx->mp, &nc_ctx->mm, (catnip_ui32_t)nc_ctx->b);          /* mp <- b^(e+1) */
      catnip_bigint_mul_small(&nc_ctx->t1, &nc_ctx->f, 2);
      catnip_bigint_mul(&nc_ctx->r, &nc_ctx->t1, &nc_ctx->mp);             /* r <- (2 * f) * b^(e+1) */
      catnip_bigint_set_small(&nc_ctx->s, (catnip_ui32_t)(nc_ctx->b * 2)); /* s <- 2 * b */
      nc_ctx->unequal_gaps = CATNIP_TRUE;

    } else {

      catnip_bigint_exp_small(&nc_ctx->mm, nc_ctx->b, nc_ctx->e, &nc_ctx->t1, &nc_ctx->t2); /* mm <- b^e */
      catnip_bigint_copy(&nc_ctx->mp, &nc_ctx->mm);                                         /* mp <- b^e */
      catnip_bigint_mul_small(&nc_ctx->t1, &nc_ctx->f, 2);
      catnip_bigint_mul(&nc_ctx->r, &nc_ctx->t1, &nc_ctx->mp); /* r <- (2 * f) * b^e */
      catnip_bigint_set_small(&nc_ctx->s, 2);                  /* s <- 2 */
    }
  } else {

    if (nc_ctx->e > CATNIP_NUMCONV_IEEE_DOUBLE_EXP_MIN && lowest_mantissa) {

      catnip_bigint_mul_small(&nc_ctx->r, &nc_ctx->f, (catnip_ui32_t)(nc_ctx->b * 2)); /* r <- (2 * b) * f */
      catnip_bigint_exp_small(&nc_ctx->t1,
                              nc_ctx->b,
                              1 - nc_ctx->e,
                              &nc_ctx->s,
                              &nc_ctx->t2);                /* NB: use 's' as temp on purpose */
      catnip_bigint_mul_small(&nc_ctx->s, &nc_ctx->t1, 2); /* s <- b^(1-e) * 2 */
      catnip_bigint_set_small(&nc_ctx->mp, 2);
      catnip_bigint_set_small(&nc_ctx->mm, 1);
      nc_ctx->unequal_gaps = CATNIP_TRUE;

    } else {

      catnip_bigint_mul_small(&nc_ctx->r, &nc_ctx->f, 2); /* r <- 2 * f */
      catnip_bigint_exp_small(&nc_ctx->t1,
                              nc_ctx->b,
                              -nc_ctx->e,
                              &nc_ctx->s,
                              &nc_ctx->t2);                /* NB: use 's' as temp on purpose */
      catnip_bigint_mul_small(&nc_ctx->s, &nc_ctx->t1, 2); /* s <- b^(-e) * 2 */
      catnip_bigint_set_small(&nc_ctx->mp, 1);
      catnip_bigint_set_small(&nc_ctx->mm, 1);
    }
  }
}

static void catnip_numconv_dragon4_scale(catnip_numconv_stringify_ctx *nc_ctx) {

  catnip_i32_t k = 0;

  for (;;) {
    catnip_bigint_add(&nc_ctx->t1, &nc_ctx->r, &nc_ctx->mp);

    if (catnip_bigint_compare(&nc_ctx->t1, &nc_ctx->s) >= (nc_ctx->high_ok ? 0 : 1)) {
      catnip_bigint_mul_small_copy(&nc_ctx->s, (catnip_ui32_t)nc_ctx->B, &nc_ctx->t1);
      k++;
    } else {
      break;
    }

    if (k > 100000) {
      CATNIP_ASSERT(k < 100000);
      break;
    }
  }

  if (k > 0) {
    goto skip_dec_k;
  }

  for (;;) {
    catnip_bigint_add(&nc_ctx->t1, &nc_ctx->r, &nc_ctx->mp);                     /* t1 = (+ r m+) */
    catnip_bigint_mul_small(&nc_ctx->t2, &nc_ctx->t1, (catnip_ui32_t)nc_ctx->B); /* t2 = (* (+ r m+) B) */
    if (catnip_bigint_compare(&nc_ctx->t2, &nc_ctx->s) <= (nc_ctx->high_ok ? -1 : 0)) {
      /* r <- (* r B)
       * s <- s
       * m+ <- (* m+ B)
       * m- <- (* m- B)
       * k <- (- k 1)
       */
      catnip_bigint_mul_small_copy(&nc_ctx->r, (catnip_ui32_t)nc_ctx->B, &nc_ctx->t1);
      catnip_bigint_mul_small_copy(&nc_ctx->mp, (catnip_ui32_t)nc_ctx->B, &nc_ctx->t1);
      if (nc_ctx->unequal_gaps) {
        catnip_bigint_mul_small_copy(&nc_ctx->mm, (catnip_ui32_t)nc_ctx->B, &nc_ctx->t1);
      }
      k--;
    } else {
      break;
    }
  }

skip_dec_k:

  if (!nc_ctx->unequal_gaps) {
    catnip_bigint_copy(&nc_ctx->mm, &nc_ctx->mp);
  }
  nc_ctx->k = k;
}

static void catnip_numconv_dragon4_generate(catnip_numconv_stringify_ctx *nc_ctx) {

  catnip_bool_t tc1, tc2;
  catnip_i32_t d;
  catnip_i32_t count = 0;

  for (;;) {
    catnip_bigint_mul_small(&nc_ctx->t1, &nc_ctx->r, (catnip_ui32_t)nc_ctx->B); /* t1 <- (* r B) */
    d = 0;
    for (;;) {
      if (catnip_bigint_compare(&nc_ctx->t1, &nc_ctx->s) < 0) {
        break;
      }
      catnip_bigint_sub_copy(&nc_ctx->t1, &nc_ctx->s, &nc_ctx->t2); /* t1 <- t1 - s */
      d++;
    }
    catnip_bigint_copy(&nc_ctx->r, &nc_ctx->t1); /* r <- (remainder (* r B) s) */
    /* d <- (quotient (* r B) s)   (in range 0...B-1) */

    catnip_bigint_mul_small_copy(&nc_ctx->mp, (catnip_ui32_t)nc_ctx->B, &nc_ctx->t2); /* m+ <- (* m+ B) */
    catnip_bigint_mul_small_copy(&nc_ctx->mm, (catnip_ui32_t)nc_ctx->B, &nc_ctx->t2); /* m- <- (* m- B) */

    /* Terminating conditions.  For fixed width output, we just ignore the
     * terminating conditions (and pretend that tc1 == tc2 == false).  The
     * the current shortcut for fixed-format output is to generate a few
     * extra digits and use rounding (with carry) to finish the output.
     */

    if (nc_ctx->is_fixed == 0) {
      /* free-form */
      tc1 = (catnip_bigint_compare(&nc_ctx->r, &nc_ctx->mm) <= (nc_ctx->low_ok ? 0 : -1));

      catnip_bigint_add(&nc_ctx->t1, &nc_ctx->r, &nc_ctx->mp); /* t1 <- (+ r m+) */
      tc2 = (catnip_bigint_compare(&nc_ctx->t1, &nc_ctx->s) >= (nc_ctx->high_ok ? 0 : 1));

    } else {
      /* fixed-format */
      tc1 = 0;
      tc2 = 0;
    }

    count++;

    if (tc1) {
      if (tc2) {
        /* tc1 = true, tc2 = true */
        catnip_bigint_mul_small(&nc_ctx->t1, &nc_ctx->r, 2);
        if (catnip_bigint_compare(&nc_ctx->t1, &nc_ctx->s) < 0) { /* (< (* r 2) s) */
          CATNIP_NUMCONV_DRAGON4_OUTPUT_PREINC(nc_ctx, count, d);
        } else {
          CATNIP_NUMCONV_DRAGON4_OUTPUT_PREINC(nc_ctx, count, d + 1);
        }
        break;
      } else {
        CATNIP_NUMCONV_DRAGON4_OUTPUT_PREINC(nc_ctx, count, d);
        break;
      }
    } else {
      if (tc2) {
        CATNIP_NUMCONV_DRAGON4_OUTPUT_PREINC(nc_ctx, count, d + 1);
        break;
      } else {
        /* tc1 = false, tc2 = false */
        CATNIP_NUMCONV_DRAGON4_OUTPUT_PREINC(nc_ctx, count, d);

        /* r <- r    (updated above: r <- (remainder (* r B) s)
         * s <- s
         * m+ <- m+  (updated above: m+ <- (* m+ B)
         * m- <- m-  (updated above: m- <- (* m- B)
         * B, low_ok, high_ok are fixed
         */

        /* fall through and continue for-loop */
      }
    }

    /* fixed-format termination conditions */
    if (nc_ctx->is_fixed) {
      if (nc_ctx->abs_pos) {
        int pos = nc_ctx->k - count + 1; /* count is already incremented, take into account */
        if (pos <= nc_ctx->req_digits) {
          break;
        }
      } else {
        if (count >= nc_ctx->req_digits) {
          break;
        }
      }
    }
  }

  nc_ctx->count = count;
}

static catnip_i32_t catnip_numconv_dragon4_fixed_format_round(catnip_numconv_stringify_ctx *nc_ctx,
                                                       catnip_i32_t round_idx) {
  catnip_i32_t t;
  catnip_uchar_t *p;
  catnip_uchar_t roundup_limit;
  catnip_i32_t ret = 0;

  /*
   *  round_idx points to the digit which is considered for rounding; the
   *  digit to its left is the final digit of the rounded value.  If round_idx
   *  is zero, rounding will be performed; the result will either be an empty
   *  rounded value or if carry happens a '1' digit is generated.
   */

  if (round_idx >= nc_ctx->count) {
    return 0;
  } else if (round_idx < 0) {
    return 0;
  }

  /*
   *  Round-up limit.
   *
   *  For even values, divides evenly, e.g. 10 -> roundup_limit=5.
   *
   *  For odd values, rounds up, e.g. 3 -> roundup_limit=2.
   *  If radix is 3, 0/3 -> down, 1/3 -> down, 2/3 -> up.
   */
  roundup_limit = (catnip_uchar_t)((nc_ctx->B + 1) / 2);

  p = &nc_ctx->digits[round_idx];
  if (*p >= roundup_limit) {
    /* carry */
    for (;;) {
      *p = 0;
      if (p == &nc_ctx->digits[0]) {
        catnip_mem_move((void *)(&nc_ctx->digits[1]),
                        (const void *)(&nc_ctx->digits[0]),
                        (catnip_ui32_t)(sizeof(char) * (catnip_ui32_t)nc_ctx->count));
        nc_ctx->digits[0] = 1; /* don't increase 'count' */
        nc_ctx->k++;           /* position of highest digit changed */
        nc_ctx->count++;       /* number of digits changed */
        ret = 1;
        break;
      }

      p--;
      t = *p;
      if (++t < nc_ctx->B) {
        *p = (catnip_uchar_t)t;
        break;
      }
    }
  }

  return ret;
}

#define CATNIP_NUMCONV_DRAGON4_NO_EXP (65536)

static catnip_hstring *catnip_numconv_dragon4_convert(catnip_numconv_stringify_ctx *nc_ctx,
                                               catnip_i32_t radix,
                                               catnip_i32_t digits,
                                               catnip_ui32_t flags,
                                               catnip_bool_t is_neg) {

  CATNIP_ASSERT(CATNIP_NUMCONV_CTX_BIGINTS_SIZE >= CATNIP_NUMCONV_MAX_FORMATTED_LENGTH);
  CATNIP_ASSERT(nc_ctx->count >= 1);

  catnip_i32_t k = nc_ctx->k;
  catnip_uchar_t *buf = (catnip_uchar_t *)&nc_ctx->f; /* XXX: union would be more correct */
  catnip_uchar_t *q = buf;

  catnip_i32_t expt = CATNIP_NUMCONV_DRAGON4_NO_EXP;

  if (!nc_ctx->abs_pos) {
    // if ((flags & DUK_N2S_FLAG_FORCE_EXP) ||       /* exponential notation forced */
    //     ((flags & DUK_N2S_FLAG_NO_ZERO_PAD) &&    /* fixed precision and zero padding would be required */
    //      (k - digits >= 1)) ||                    /* (e.g. k=3, digits=2 -> "12X") */
    //     ((k > 21 || k <= -6) && (radix == 10))) { /* toString() conditions */
    if ((k > 21 || k <= -6) && (radix == 10)) {
      expt = k - 1; /* e.g. 12.3 -> digits="123" k=2 -> 1.23e1 */
      k = 1;        /* generate mantissa with a single leading whole number digit */
    }
  }

  if (is_neg) {
    *q++ = '-';
  }

  catnip_i32_t pos = (k >= 1 ? k : 1);
  catnip_i32_t pos_end;

  if (nc_ctx->is_fixed) {
    if (nc_ctx->abs_pos) {
      pos_end = -digits;
    } else {
      pos_end = k - digits;
    }
  } else {
    pos_end = k - nc_ctx->count;
  }

  if (pos_end > 0)
    pos_end = 0;

  while (pos > pos_end) {
    if (pos == 0) {
      *q++ = '.';
    }

    if (pos > k) {
      *q++ = '0';
    } else if (pos <= k - nc_ctx->count) {
      *q++ = '0';
    } else {
      catnip_uchar_t dig = nc_ctx->digits[k - pos];
      CATNIP_ASSERT(dig >= 0 && dig <= nc_ctx->B);
      *q++ = catnip_numconv_digits[dig];
    }

    pos--;
  }

  CATNIP_ASSERT(pos <= 1);

  if (expt != CATNIP_NUMCONV_DRAGON4_NO_EXP) {
    *q++ = 'e';

    catnip_char_t expt_sign;
    if (expt >= 0) {
      expt_sign = '+';
    } else {
      expt_sign = '-';
      expt = -expt;
    }

    *q++ = expt_sign;
    q += catnip_numconv_dragon4_format_uint32(q, expt, radix);
  }

  return catnip_hstring_new((catnip_char_t *)buf, (catnip_ui32_t)(q - buf));
}

static void catnip_numconv_dragon4_double_to_ctx(catnip_numconv_stringify_ctx *nc_ctx, catnip_f64_t x) {

  /*
   *    seeeeeee eeeeffff ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff
   *       A        B        C        D        E        F        G        H
   *
   *    s       sign bit
   *    eee...  exponent field
   *    fff...  fraction
   *
   *    ieee value = 1.ffff... * 2^(e - 1023)  (normal)
   *               = 0.ffff... * 2^(-1022)     (denormal)
   *
   *    algorithm v = f * b^e
   */

  catnip_double_union u;
  CATNIP_DBLUNION_SET_DOUBLE(&u, x);

  nc_ctx->f.n = 2;

  catnip_ui32_t tmp = CATNIP_DBLUNION_GET_LOW32(&u);
  nc_ctx->f.v[0] = tmp;
  tmp = CATNIP_DBLUNION_GET_HIGH32(&u);
  nc_ctx->f.v[1] = tmp & 0x000fffffUL;
  catnip_i32_t expt = (catnip_i32_t)((tmp >> 20) & 0x07ffUL);

  if (expt == 0) {
    /* denormal */
    expt = CATNIP_NUMCONV_IEEE_DOUBLE_EXP_MIN - 52;
    catnip_bigint_normalize(&nc_ctx->f);
  } else {
    /* normal: implicit leading 1-bit */
    nc_ctx->f.v[1] |= 0x00100000UL;
    expt = expt - CATNIP_NUMCONV_IEEE_DOUBLE_EXP_BIAS - 52;
    CATNIP_ASSERT_BIGINT_VALID(&nc_ctx->f); /* true, because v[1] has at least one bit set */
  }

  nc_ctx->e = expt;
}

static void catnip_numconv_dragon4_ctx_to_double(catnip_numconv_stringify_ctx *nc_ctx, catnip_f64_t *x) {
  catnip_double_union u;
  catnip_i32_t expt;
  catnip_i32_t i;
  catnip_i32_t bitstart;
  catnip_i32_t bitround;
  catnip_i32_t bitidx;
  catnip_i32_t skip_round;
  catnip_ui32_t t, v;

  CATNIP_ASSERT(nc_ctx->count == 53 + 1);

  /* Sometimes this assert is not true right now; it will be true after
   * rounding.  See: test-bug-numconv-mantissa-assert.js.
   */
  // CATNIP_ASSERT(nc_ctx->digits[0] == 1); /* zero handled by caller */

  /* Should not be required because the code below always sets both high
   * and low parts, but at least gcc-4.4.5 fails to deduce this correctly
   * (perhaps because the low part is set (seemingly) conditionally in a
   * loop), so this is here to avoid the bogus warning.
   */
  catnip_mem_zero((void *)&u, sizeof(u));

  /*
   *  Figure out how generated digits match up with the mantissa,
   *  and then perform rounding.  If mantissa overflows, need to
   *  recompute the exponent (it is bumped and may overflow to
   *  infinity).
   *
   *  For normal numbers the leading '1' is hidden and ignored,
   *  and the last bit is used for rounding:
   *
   *                          rounding pt
   *       <--------52------->|
   *     1 x x x x ... x x x x|y  ==>  x x x x ... x x x x
   *
   *  For denormals, the leading '1' is included in the number,
   *  and the rounding point is different:
   *
   *                      rounding pt
   *     <--52 or less--->|
   *     1 x x x x ... x x|x x y  ==>  0 0 ... 1 x x ... x x
   *
   *  The largest denormals will have a mantissa beginning with
   *  a '1' (the explicit leading bit); smaller denormals will
   *  have leading zero bits.
   *
   *  If the exponent would become too high, the result becomes
   *  Infinity.  If the exponent is so small that the entire
   *  mantissa becomes zero, the result becomes zero.
   *
   *  Note: the Dragon4 'k' is off-by-one with respect to the IEEE
   *  exponent.  For instance, k==0 indicates that the leading '1'
   *  digit is at the first binary fraction position (0.1xxx...);
   *  the corresponding IEEE exponent would be -1.
   */

  skip_round = 0;

recheck_exp:

  expt = nc_ctx->k - 1; /* IEEE exp without bias */
  if (expt > 1023) {
    /* Infinity */
    bitstart = -255; /* needed for inf: causes mantissa to become zero,
                      * and rounding to be skipped.
                      */
    expt = 2047;
  } else if (expt >= -1022) {
    /* normal */
    bitstart = 1; /* skip leading digit */
    expt += CATNIP_NUMCONV_IEEE_DOUBLE_EXP_BIAS;
    CATNIP_ASSERT(expt >= 1 && expt <= 2046);
  } else {
    /* denormal or zero */
    bitstart = 1023 + expt; /* expt==-1023 -> bitstart=0 (leading 1);
                             * expt==-1024 -> bitstart=-1 (one left of leading 1), etc
                             */
    expt = 0;
  }
  bitround = bitstart + 52;

  if (!skip_round) {
    if (catnip_numconv_dragon4_fixed_format_round(nc_ctx, bitround)) {
      /* Corner case: see test-numconv-parse-mant-carry.js.  We could
       * just bump the exponent and update bitstart, but it's more robust
       * to recompute (but avoid rounding twice).
       */
      skip_round = 1;
      goto recheck_exp;
    }
  }

  /*
   *  Create mantissa
   */

  t = 0;
  for (i = 0; i < 52; i++) {
    bitidx = bitstart + 52 - 1 - i;
    if (bitidx >= nc_ctx->count) {
      v = 0;
    } else if (bitidx < 0) {
      v = 0;
    } else {
      v = nc_ctx->digits[bitidx];
    }
    CATNIP_ASSERT(v == 0 || v == 1);
    t += v << (i % 32);
    if (i == 31) {
      /* low 32 bits is complete */
      CATNIP_DBLUNION_SET_LOW32(&u, t);
      t = 0;
    }
  }
  /* t has high mantissa */

  CATNIP_ASSERT(expt >= 0 && expt <= 0x7ffL);
  t += ((catnip_ui32_t)expt) << 20;
#if 0 /* caller handles sign change */
	if (negative) {
		t |= 0x80000000U;
	}
#endif
  CATNIP_DBLUNION_SET_HIGH32(&u, t);

  *x = CATNIP_DBLUNION_GET_DOUBLE(&u);
}

catnip_hstring *catnip_numconv_stringify_f64(catnip_f64_t x) {

  catnip_i32_t radix = 10;
  catnip_i32_t digits = 0;

  catnip_numconv_stringify_ctx nc_ctx_alloc;
  catnip_numconv_stringify_ctx *nc_ctx = &nc_ctx_alloc;

  catnip_bool_t is_neg;

  if (CATNIP_F64_SIGNBIT(x)) {
    x = -x;
    is_neg = CATNIP_TRUE;
  } else {
    is_neg = CATNIP_FALSE;
  }

  // TODO These can all share the same string, no need to create new ones every time
  if (CATNIP_F64_ISNAN(x)) {
    return catnip_hstring_new_from_cstring("NaN");
  } else if (CATNIP_F64_ISINFINITE(x)) {
    if (is_neg)
      return catnip_hstring_new_from_cstring("-Infinity");
    else
      return catnip_hstring_new_from_cstring("Infinity");
  } // TODO Investigate 0 shortcut

  catnip_ui32_t uval = (catnip_ui32_t)x;
  if (((catnip_f64_t)uval) == x) {
    catnip_uchar_t *buf = (catnip_uchar_t *)(&nc_ctx->f);
    catnip_uchar_t *p = buf;

    CATNIP_ASSERT(CATNIP_NUMCONV_CTX_BIGINTS_SIZE >= 32 + 1);

    if (is_neg && uval != 0) {
      /* no negative sign for zero */
      *p++ = '-';
    }
    p += catnip_numconv_dragon4_format_uint32(p, uval, radix);
    return catnip_hstring_new((catnip_char_t *)buf, (catnip_i32_t)(p - buf));
  }

  /*
   *  Dragon4 setup.
   *
   *  Convert double from IEEE representation for conversion;
   *  normal finite values have an implicit leading 1-bit.  The
   *  slow path algorithm doesn't handle zero, so zero is special
   *  cased here but still creates a valid nc_ctx, and goes
   *  through normal formatting in case special formatting has
   *  been requested (e.g. forced exponential format: 0 -> "0e+0").
   */

  /* Would be nice to bulk clear the allocation, but the context
   * is 1-2 kilobytes and nothing should rely on it being zeroed.
   */

  nc_ctx->is_s2n = CATNIP_FALSE;
  nc_ctx->b = 2;
  nc_ctx->B = radix;
  nc_ctx->abs_pos = CATNIP_FALSE;
  // if (flags & DUK_N2S_FLAG_FIXED_FORMAT) {
  //   nc_ctx->is_fixed = 1;
  //   if (flags & DUK_N2S_FLAG_FRACTION_DIGITS) {
  //     /* absolute req_digits; e.g. digits = 1 -> last digit is 0,
  //      * but add an extra digit for rounding.
  //      */
  //     nc_ctx->abs_pos = 1;
  //     nc_ctx->req_digits = (-digits + 1) - 1;
  //   } else {
  //     nc_ctx->req_digits = digits + 1;
  //   }
  // } else {
  nc_ctx->is_fixed = CATNIP_FALSE;
  nc_ctx->req_digits = 0;
  // }

  // if (c == DUK_FP_ZERO) {
  if (x == 0) {
    /* Zero special case: fake requested number of zero digits; ensure
     * no sign bit is printed.  Relative and absolute fixed format
     * require separate handling.
     */
    catnip_i32_t count;
    if (nc_ctx->is_fixed) {
      if (nc_ctx->abs_pos) {
        count = digits + 2; /* lead zero + 'digits' fractions + 1 for rounding */
      } else {
        count = digits + 1; /* + 1 for rounding */
      }
    } else {
      count = 1;
    }
    catnip_mem_zero((void *)nc_ctx->digits, count);
    nc_ctx->count = count;
    nc_ctx->k = 1; /* 0.000... */
    is_neg = 0;
    goto zero_skip;
  }

  catnip_numconv_dragon4_double_to_ctx(nc_ctx, x); /* -> sets 'f' and 'e' */

  /*
   *  Dragon4 slow path digit generation.
   */

  catnip_numconv_dragon4_prepare(nc_ctx); /* setup many variables in nc_ctx */

  catnip_numconv_dragon4_scale(nc_ctx);

  catnip_numconv_dragon4_generate(nc_ctx);

zero_skip:

  // if (flags & DUK_N2S_FLAG_FIXED_FORMAT) {
  // 	/* Perform fixed-format rounding. */
  // 	catnip_i32_t roundpos;
  // 	if (flags & DUK_N2S_FLAG_FRACTION_DIGITS) {
  // 		/* 'roundpos' is relative to nc_ctx->k and increases to the right
  // 		 * (opposite of how 'k' changes).
  // 		 */
  // 		roundpos = -digits; /* absolute position for digit considered for rounding */
  // 		roundpos = nc_ctx->k - roundpos;
  // 	} else {
  // 		roundpos = digits;
  // 	}
  // 	DUK_DDD(DUK_DDDPRINT("rounding: k=%ld, count=%ld, digits=%ld, roundpos=%ld",
  // 	                     (long) nc_ctx->k,
  // 	                     (long) nc_ctx->count,
  // 	                     (long) digits,
  // 	                     (long) roundpos));
  // 	(void) duk__dragon4_fixed_format_round(nc_ctx, roundpos);

  // 	/* Note: 'count' is currently not adjusted by rounding (i.e. the
  // 	 * digits are not "chopped off".  That shouldn't matter because
  // 	 * the digit position (absolute or relative) is passed on to the
  // 	 * convert-and-push function.
  // 	 */
  // }

  return catnip_numconv_dragon4_convert(nc_ctx, radix, digits, 0, is_neg);
}

catnip_f64_t catnip_numconv_parse(catnip_hstring *str) {
  CATNIP_ASSERT(str != CATNIP_NULL);

  str = catnip_str_trim(str);

  catnip_ui32_t p_bytelen = str->bytelen;

  if (p_bytelen == 0) {
    // Empty string
    goto parse_fail;
  }

  catnip_char_t *p = catnip_hstring_get_data(str);
  catnip_f64_t result;

  catnip_char_t ch = *p;
  catnip_bool_t is_negitive = CATNIP_FALSE;
  if (ch == '+') {
    ++p;
    --p_bytelen;
  } else if (ch == '-') {
    ++p;
    --p_bytelen;
    is_negitive = CATNIP_TRUE;
  }

  if (p_bytelen == 0) {
    // + or - only
    goto parse_fail;
  }

  if (p_bytelen >= 8 && catnip_util_strcmp(p, "Infinity", 8) == 0) {
    result = CATNIP_F64_INFINITY;
    goto negcheck_and_ret;
  }

  catnip_i32_t radix = 10;

  if ((p_bytelen >= 2) && (*p == '0')) {
    catnip_i32_t detect_radix = -1;
    ch = CATNIP_LOWERCASE_CHAR_ASCII(p[1]);

    if (ch == 'x') { // "0x" prefix -> hexadecimal
      detect_radix = 16;
    } else if (ch == 'o') { // "0o" prefix -> octal
      detect_radix = 8;
    } else if (ch == 'b') { // "0b" prefix -> binary
      detect_radix = 2;
    }

    if (detect_radix != -1) {
      // TODO Flags stuff here
      radix = detect_radix;
      p += 2;
      p_bytelen -= 2;
    }
  }

  // Scan number and setup for Dragon4

  catnip_numconv_stringify_ctx nc_ctx_alloc;
  catnip_numconv_stringify_ctx *nc_ctx = &nc_ctx_alloc;
  
  catnip_bigint_set_small(&nc_ctx->f, 0);
  catnip_i32_t dig_prec = 0;
  catnip_i32_t dig_lzero = 0;
  catnip_i32_t dig_whole = 0;
  catnip_i32_t dig_frac = -1;
  catnip_i32_t dig_expt = -1;
  catnip_i32_t expt = 0;
  catnip_i32_t expt_adj = 0; /* essentially tracks digit position of lowest 'f' digit */
  catnip_bool_t expt_neg = 0;
  catnip_i32_t dig;

  for (;;) {

    if (p_bytelen == 0)
      break;
    ch = *p++;

    --p_bytelen;

    /* Most common cases first. */
    if (ch >= (catnip_i32_t)'0' && ch <= (catnip_i32_t)'9') {
      dig = (catnip_i32_t)ch - '0' + 0;
    } else if (ch == '.') {
      /* A leading digit is not required in some cases, e.g. accept ".123".
       * In other cases (JSON.parse()) a leading digit is required.  This
       * is checked for after the loop.
       */
      if (dig_frac >= 0 || dig_expt >= 0) {
        // if (flags & DUK_S2N_FLAG_ALLOW_GARBAGE) {
        // 	DUK_DDD(DUK_DDDPRINT("garbage termination (invalid period)"));
        // 	break;
        // } else {
        // DUK_DDD(DUK_DDDPRINT("parse failed: period not allowed"));
        goto parse_fail;
        // }
      }

      // if ((flags & DUK_S2N_FLAG_ALLOW_FRAC) == 0) {
      //   /* Some contexts don't allow fractions at all; this can't be a
      //    * post-check because the state ('f' and expt) would be incorrect.
      //    */
      //   if (flags & DUK_S2N_FLAG_ALLOW_GARBAGE) {
      //     DUK_DDD(DUK_DDDPRINT("garbage termination (invalid first period)"));
      //     break;
      //   } else {
      //     DUK_DDD(DUK_DDDPRINT("parse failed: fraction part not allowed"));
      //   }
      // }

      // DUK_DDD(DUK_DDDPRINT("start fraction part"));
      dig_frac = 0;
      continue;
      // } else if ((flags & DUK_S2N_FLAG_ALLOW_EXP) && dig_expt < 0 &&
      //            (ch == (catnip_i32_t)'e' || ch == (catnip_i32_t)'E')) {
    } else if (dig_expt < 0 && (ch == (catnip_i32_t)'e' || ch == (catnip_i32_t)'E')) {
      /* Note: we don't parse back exponent notation for anything else
       * than radix 10, so this is not an ambiguous check (e.g. hex
       * exponent values may have 'e' either as a significand digit
       * or as an exponent separator).
       *
       * If the exponent separator occurs twice, 'e' will be interpreted
       * as a digit (= 14) and will be rejected as an invalid decimal
       * digit.
       */

      /* Exponent without a sign or with a +/- sign is accepted
       * by all call sites (even JSON.parse()).
       */
      if (p_bytelen != 0) {
        ch = *p;
        if (ch == '-') {
          expt_neg = 1;
          p++;
          --p_bytelen;
        } else if (ch == '+') {
          p++;
          --p_bytelen;
        }
      }
      dig_expt = 0;
      continue;
    } else if (ch >= 'a' && ch <= 'z') {
      dig = (catnip_i32_t)(ch - 'a' + 0x0a);
    } else if (ch >= 'A' && ch <= 'Z') {
      dig = (catnip_i32_t)(ch - 'A' + 0x0a);
    } else {
      dig = 255; /* triggers garbage digit check below */
    }
    CATNIP_ASSERT((dig >= 0 && dig <= 35) || dig == 255);

    if (dig >= radix) {
      // if (flags & DUK_S2N_FLAG_ALLOW_GARBAGE) {
      //   DUK_DDD(DUK_DDDPRINT("garbage termination"));
      //   break;
      // } else {
      //   DUK_DDD(DUK_DDDPRINT("parse failed: trailing garbage or invalid digit"));
      goto parse_fail;
      // }
    }

    if (dig_expt < 0) {
      /* whole or fraction digit */

      if (dig_prec < catnip_numconv_digits_for_radix[radix - 2]) {
        /* significant from precision perspective */

        catnip_bool_t f_zero = catnip_bigint_is_zero(&nc_ctx->f);
        if (f_zero && dig == 0) {
          /* Leading zero is not counted towards precision digits; not
           * in the integer part, nor in the fraction part.
           */
          if (dig_frac < 0) {
            dig_lzero++;
          }
        } else {
          /* XXX: join these ops (multiply-accumulate), but only if
           * code footprint decreases.
           */
          catnip_bigint_mul_small(&nc_ctx->t1, &nc_ctx->f, (catnip_ui32_t)radix);
          catnip_bigint_add_small(&nc_ctx->f, &nc_ctx->t1, (catnip_ui32_t)dig);
          dig_prec++;
        }
      } else {
        /* Ignore digits beyond a radix-specific limit, but note them
         * in expt_adj.
         */
        expt_adj++;
      }

      if (dig_frac >= 0) {
        dig_frac++;
        expt_adj--;
      } else {
        dig_whole++;
      }
    } else {
      /* exponent digit */

      CATNIP_ASSERT(radix == 10);
      expt = expt * radix + dig;
      if (expt > CATNIP_NUMCONV_MAX_EXPONENT) {
        /* Impose a reasonable exponent limit, so that exp
         * doesn't need to get tracked using a bigint.
         */
        goto parse_explimit_error;
      }
      dig_expt++;
    }
  }

  /* Leading zero. */

  // if (dig_lzero > 0 && dig_whole > 1) {
  //   if ((flags & DUK_S2N_FLAG_ALLOW_LEADING_ZERO) == 0) {
  //     DUK_DDD(DUK_DDDPRINT("parse failed: leading zeroes not allowed in integer part"));
  //     goto parse_fail;
  //   }
  // }

  /* Validity checks for various fraction formats ("0.1", ".1", "1.", "."). */

  if (dig_whole == 0) {
    if (dig_frac == 0) {
      /* "." is not accepted in any format */
      goto parse_fail;
    } else if (dig_frac > 0) {
      /* ".123" */
      // if ((flags & DUK_S2N_FLAG_ALLOW_NAKED_FRAC) == 0) {
      //   DUK_DDD(DUK_DDDPRINT("parse failed: fraction part not allowed without "
      //                        "leading integer digit(s)"));
      //   goto parse_fail;
      // }
    } else {
      /* Empty ("") is allowed in some formats (e.g. Number(''), as zero,
       * but it must not have a leading +/- sign (GH-2019).  Note that
       * for Number(), h_str is already trimmed so we can check for zero
       * length and still get Number('  +  ') == NaN.
       */
      // if ((flags & DUK_S2N_FLAG_ALLOW_EMPTY_AS_ZERO) == 0) {
      //   DUK_DDD(DUK_DDDPRINT("parse failed: empty string not allowed (as zero)"));
      //   goto parse_fail;
      // } else if (duk_hstring_get_bytelen(h_str) != 0) {
      if (str->bytelen != 0) {
        // no digits, but not empty (had a +/- sign)
        goto parse_fail;
      }
    }
  } else {
    if (dig_frac == 0) {
      /* "123." is allowed in some formats */
      // if ((flags & DUK_S2N_FLAG_ALLOW_EMPTY_FRAC) == 0) {
      //   DUK_DDD(DUK_DDDPRINT("parse failed: empty fractions"));
      //   goto parse_fail;
      // }
    } else if (dig_frac > 0) {
      /* "123.456" */
      ;
    } else {
      /* "123" */
      ;
    }
  }

  /* Exponent without digits (e.g. "1e" or "1e+").  If trailing garbage is
   * allowed, ignore exponent part as garbage (= parse as "1", i.e. exp 0).
   */

  if (dig_expt == 0) {
    // if ((flags & DUK_S2N_FLAG_ALLOW_GARBAGE) == 0) {
    //   DUK_DDD(DUK_DDDPRINT("parse failed: empty exponent"));
    goto parse_fail;
    // }
    // CATNIP_ASSERT(expt == 0);
  }

  if (expt_neg) {
    expt = -expt;
  }
  // DUK_DDD(
  //     DUK_DDDPRINT("expt=%ld, expt_adj=%ld, net exponent -> %ld", (long)expt, (long)expt_adj, (long)(expt + expt_adj)));
  expt += expt_adj;

  /* Fast path check. */

  if (nc_ctx->f.n <= 1 && /* 32-bit value */
      expt == 0 /* no net exponent */) {
    /* Fast path is triggered for no exponent and also for balanced exponent
     * and fraction parts, e.g. for "1.23e2" == "123".  Remember to respect
     * zero sign.
     */

    /* XXX: could accept numbers larger than 32 bits, e.g. up to 53 bits? */
    if (nc_ctx->f.n == 1) {
      result = (double)nc_ctx->f.v[0];
    } else {
      result = 0.0;
    }
    goto negcheck_and_ret;
  }

  /* Significand ('f') padding. */

  while (dig_prec < catnip_numconv_digits_for_radix[radix - 2]) {
    /* Pad significand with "virtual" zero digits so that Dragon4 will
     * have enough (apparent) precision to work with.
     */
    catnip_bigint_mul_small_copy(&nc_ctx->f, (catnip_ui32_t)radix, &nc_ctx->t1);
    expt--;
    dig_prec++;
  }

  /* Detect zero special case. */

  if (nc_ctx->f.n == 0) {
    /* This may happen even after the fast path check, if exponent is
     * not balanced (e.g. "0e1").  Remember to respect zero sign.
     */
    result = 0.0;
    goto negcheck_and_ret;
  }

  /* Quick reject of too large or too small exponents.  This check
   * would be incorrect for zero (e.g. "0e1000" is zero, not Infinity)
   * so zero check must be above.
   */

  const catnip_numconv_exp_limit *explim = &catnip_numconv_exp_limits[radix - 2];
  if (expt > explim->upper) {
    // DUK_DDD(DUK_DDDPRINT("exponent too large -> infinite"));
    result = CATNIP_F64_INFINITY;
    goto negcheck_and_ret;
  } else if (expt < explim->lower) {
    // DUK_DDD(DUK_DDDPRINT("exponent too small -> zero"));
    result = 0;
    goto negcheck_and_ret;
  }

  nc_ctx->is_s2n = 1;
  nc_ctx->e = expt;
  nc_ctx->b = radix;
  nc_ctx->B = 2;
  nc_ctx->is_fixed = 1;
  nc_ctx->abs_pos = 0;
  nc_ctx->req_digits = 53 + 1;

  /*
   *  Dragon4 slow path (binary) digit generation.
   *  An extra digit is generated for rounding.
   */

  catnip_numconv_dragon4_prepare(nc_ctx); /* setup many variables in nc_ctx */

  catnip_numconv_dragon4_scale(nc_ctx);

  catnip_numconv_dragon4_generate(nc_ctx);

  CATNIP_ASSERT(nc_ctx->count == 53 + 1);

  /*
   *  Convert binary digits into an IEEE double.  Need to handle
   *  denormals and rounding correctly.
   *
   *  Some call sites currently assume the result is always a
   *  non-fastint double.  If this is changed, check all call
   *  sites.
   */

  catnip_numconv_dragon4_ctx_to_double(nc_ctx, &result); // TODO make this return it
  goto negcheck_and_ret;

negcheck_and_ret:
  catnip_hstring_deref(str);

  if (is_negitive) {
    result = -result;
  }

  return result;

parse_fail:
  catnip_hstring_deref(str);
  // parse failed
  return CATNIP_F64_NAN;

parse_explimit_error:
  catnip_hstring_deref(str);
  // parse failed, exponent too large
  return CATNIP_F64_NAN;
}
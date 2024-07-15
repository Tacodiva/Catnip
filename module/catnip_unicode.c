
#include "./catnip.h"

// https://github.com/svaarala/duktape/blob/50af773b1b32067170786c2b7c661705ec7425d4/src-input/duk_unicode_support.c#L181
catnip_bool_t catnip_unicode_decode_utf8(const catnip_char_t **ptr,
                                         const catnip_char_t *ptr_start,
                                         const catnip_char_t *ptr_end,
                                         catnip_codepoint_t *out_cp) {
  const catnip_char_t *p;
  catnip_ui32_t res;
  catnip_uchar_t ch;
  catnip_i32_t n;

  p = *ptr;

  if (p < ptr_start || p >= ptr_end) {
    goto fail;
  }

  /*
   *  UTF-8 decoder which accepts longer than standard byte sequences.
   *  This allows full 32-bit code points to be used.
   */

  ch = *p++;
  if (ch < 0x80) {
    /* 0xxx xxxx   [7 bits] */
    res = (catnip_ui32_t)(ch & 0x7f);
    n = 0;
  } else if (ch < 0xc0) {
    /* 10xx xxxx -> invalid */
    goto fail;
  } else if (ch < 0xe0) {
    /* 110x xxxx   10xx xxxx   [11 bits] */
    res = (catnip_ui32_t)(ch & 0x1f);
    n = 1;
  } else if (ch < 0xf0) {
    /* 1110 xxxx   10xx xxxx   10xx xxxx   [16 bits] */
    res = (catnip_ui32_t)(ch & 0x0f);
    n = 2;
  } else if (ch < 0xf8) {
    /* 1111 0xxx   10xx xxxx   10xx xxxx   10xx xxxx   [21 bits] */
    res = (catnip_ui32_t)(ch & 0x07);
    n = 3;
  } else if (ch < 0xfc) {
    /* 1111 10xx   10xx xxxx   10xx xxxx   10xx xxxx   10xx xxxx   [26 bits] */
    res = (catnip_ui32_t)(ch & 0x03);
    n = 4;
  } else if (ch < 0xfe) {
    /* 1111 110x   10xx xxxx   10xx xxxx   10xx xxxx   10xx xxxx   10xx xxxx [31
     * bits] */
    res = (catnip_ui32_t)(ch & 0x01);
    n = 5;
  } else if (ch < 0xff) {
    /* 1111 1110   10xx xxxx   10xx xxxx   10xx xxxx   10xx xxxx   10xx xxxx
     * 10xx xxxx   [36 bits] */
    res = (catnip_ui32_t)(0);
    n = 6;
  } else {
    /* 8-byte format could be:
     * 1111 1111   10xx xxxx   10xx xxxx   10xx xxxx   10xx xxxx   10xx xxxx
     * 10xx xxxx   10xx xxxx   [41 bits]
     *
     * However, this format would not have a zero bit following the
     * leading one bits and would not allow 0xFF to be used as an
     * "invalid xutf-8" marker for internal keys.  Further, 8-byte
     * encodings (up to 41 bit code points) are not currently needed.
     */
    goto fail;
  }

  CATNIP_ASSERT(p >= ptr_start); /* verified at beginning */
  if (p + n > ptr_end) {
    /* check pointer at end */
    goto fail;
  }

  while (n > 0) {
    CATNIP_ASSERT(p >= ptr_start && p < ptr_end);
    ch = (catnip_ui32_t)(*p++);
#if 0
		if (ch & 0xc0 != 0x80) {
			/* not a continuation byte */
			p--;
			*ptr = p;
			*out_cp = DUK_UNICODE_CP_REPLACEMENT_CHARACTER;
			return 1;
		}
#endif
    res = (res << 6) + (catnip_ui32_t)(ch & 0x3f);
    n--;
  }

  *ptr = p;
  *out_cp = res;
  return CATNIP_TRUE;

fail:
  return CATNIP_FALSE;
}

catnip_codepoint_t
catnip_unicode_decode_utf8_checked(const catnip_char_t **ptr,
                                   const catnip_char_t *ptr_start,
                                   const catnip_char_t *ptr_end) {
  catnip_codepoint_t cp;
  if (!catnip_unicode_decode_utf8(ptr, ptr_start, ptr_end, &cp)) {
    CATNIP_ASSERT(CATNIP_FALSE);
  }
  return cp;
}

// https://github.com/svaarala/duktape/blob/50af773b1b32067170786c2b7c661705ec7425d4/src-input/duk_unicode_support.c#L629
catnip_bool_t catnip_unicode_is_line_terminator(catnip_codepoint_t cp) {
  /*
   *  E5 Section 7.3
   *
   *  A LineTerminatorSequence essentially merges <CR> <LF> sequences
   *  into a single line terminator.  This must be handled by the caller.
   */

  if (cp == 0x000aL || cp == 0x000dL || cp == 0x2028L || cp == 0x2029L) {
    return 1;
  }

  return 0;
}

// https://github.com/svaarala/duktape/blob/50af773b1b32067170786c2b7c661705ec7425d4/src-input/duk_unicode_support.c#L556
catnip_bool_t catnip_unicode_is_whitespace(catnip_codepoint_t cp) {
  /*
   *  E5 Section 7.2 specifies six characters specifically as
   *  white space:
   *
   *    - 0009: <control>
   *    - 000B: <control>
   *    - 000C: <control>
   *    - 0020: SPACE
   *    - 00A0: NO-BREAK SPACE
   *    - FEFF: ZERO WIDTH NO-BREAK SPACE
   *
   *  It also specifies any Unicode category 'Zs' characters as white
   *  space.  Current result (Unicode 12.1.0):
   *
   *    CATEGORY: Zs
   *    - 0020: SPACE
   *    - 00A0: NO-BREAK SPACE
   *    - 1680: OGHAM SPACE MARK
   *    - 2000: EN QUAD
   *    - 2001: EM QUAD
   *    - 2002: EN SPACE
   *    - 2003: EM SPACE
   *    - 2004: THREE-PER-EM SPACE
   *    - 2005: FOUR-PER-EM SPACE
   *    - 2006: SIX-PER-EM SPACE
   *    - 2007: FIGURE SPACE
   *    - 2008: PUNCTUATION SPACE
   *    - 2009: THIN SPACE
   *    - 200A: HAIR SPACE
   *    - 202F: NARROW NO-BREAK SPACE
   *    - 205F: MEDIUM MATHEMATICAL SPACE
   *    - 3000: IDEOGRAPHIC SPACE
   *
   *    RANGES:
   *    - 0020
   *    - 00A0
   *    - 1680
   *    - 2000-200A
   *    - 202F
   *    - 205F
   *    - 3000
   *
   *  A manual decoder (below) is probably most compact for this.
   */

  catnip_ui32_t lo;
  catnip_ui32_t hi;

  /* cp == -1 (EOF) never matches and causes return value 0 */

  lo = (catnip_ui32_t)(cp & 0xff);
  hi = (catnip_ui32_t)(cp >> 8);

  if (hi == 0x0000UL) {
    if (lo == 0x09U || lo == 0x0bU || lo == 0x0cU || lo == 0x20U ||
        lo == 0xa0U) {
      return CATNIP_TRUE;
    }
  } else if (hi == 0x0020UL) {
    if (lo <= 0x0aU || lo == 0x2fU || lo == 0x5fU) {
      return CATNIP_TRUE;
    }
  } else if (cp == 0x1680L || cp == 0x3000L || cp == 0xfeffL) {
    return CATNIP_TRUE;
  }

  return CATNIP_FALSE;
}

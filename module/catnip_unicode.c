
#include "./catnip.h"

catnip_codepoint_t catnip_unicode_decode_utf16(const catnip_wchar_t **ptr, const catnip_wchar_t *ptr_end) {
  const catnip_wchar_t *p = *ptr;
  ++*ptr;

  CATNIP_ASSERT(p < ptr_end);

  const catnip_wchar_t first = *p;

  if ((first & 0xFC00) == 0xD800) {
    // We have a high surrogate.
    ++p;
    
    if (p >= ptr_end) {
      // We've hit the end of the string and have no surrogate pair :c
      return first;
    }

    const catnip_wchar_t second = *p;

    if ((second & 0xFC00) == 0xDC00) {
      // We have a low surrogate. Progress the pointer and reassmable the codepoint
      ++*ptr;

      return (((first & 0x3FF) << 10) | (second & 0x3FF)) + 0x10000;
    }

    // No second surrogate, return the first
    return first;
  }

  return first;
}

catnip_codepoint_t catnip_unicode_decode_utf16_backwards(const catnip_wchar_t **ptr, const catnip_wchar_t *ptr_start) {
  
  const catnip_wchar_t *p = --*ptr;

  CATNIP_ASSERT(p >= ptr_start);

  const catnip_wchar_t first = *p;

  if ((first & 0xFC00) == 0xDC00) {
    // We have a low surrogate.
    --p;
    
    if (p < ptr_start) {
      // We've hit the end of the string and have no surrogate pair :c
      return first;
    }

    const catnip_wchar_t high = *p;

    if ((high & 0xFC00) == 0xD800) {
      // We have a high surrogate. Progress the pointer and reassmable the codepoint
      --*ptr;

      return (((high & 0x3FF) << 10) | (first & 0x3FF)) + 0x10000;
    }

    // No second surrogate, return the first
    return first;
  }

  return first;
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

catnip_codepoint_t catnip_unicode_to_lowercase(catnip_codepoint_t codepoint) {

  /** ASCII */
  if (codepoint < 0x80) {

    if (codepoint >= 'A' && codepoint <= 'Z') {
      codepoint = codepoint - 'A' + 'a';
    }
  }

  /** 
   * TODO 
   * There's a whole bunch of languages which are not english and need their case stuff too.
   * Duktape handles it like this:
   * https://github.com/svaarala/duktape/blob/50af773b1b32067170786c2b7c661705ec7425d4/src-input/duk_unicode_support.c#L876
   */

  return codepoint;
}


#ifndef CATNIP_UNICODE_H_INCLUDED
#define CATNIP_UNICODE_H_INCLUDED

#include "./catnip.h"

catnip_bool_t catnip_unicode_is_line_terminator(catnip_codepoint_t cp);
catnip_bool_t catnip_unicode_is_whitespace(catnip_codepoint_t cp);

catnip_bool_t catnip_unicode_decode_utf8(const catnip_char_t **ptr,
                                         const catnip_char_t *ptr_start,
                                         const catnip_char_t *ptr_end,
                                         catnip_codepoint_t *out_cp);

catnip_codepoint_t
catnip_unicode_decode_utf8_checked(const catnip_char_t **ptr,
                                   const catnip_char_t *ptr_start,
                                   const catnip_char_t *ptr_end);

/* Uppercase A is 0x41, lowercase a is 0x61; OR 0x20 to convert uppercase
 * to lowercase.
 */
#define CATNIP_LOWERCASE_CHAR_ASCII(x) ((x) | 0x20)

#endif
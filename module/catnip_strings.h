
#ifndef CATNIP_STRINGS_H_INCLUDED
#define CATNIP_STRINGS_H_INCLUDED

#include "./catnip.h"

extern catnip_hstring *CATNIP_STRING_BLANK;
extern catnip_hstring *CATNIP_STRING_NAN;
extern catnip_hstring *CATNIP_STRING_POS_INFINITY;
extern catnip_hstring *CATNIP_STRING_NEG_INFINITY;
extern catnip_hstring *CATNIP_STRING_PRINTABLE_ASCII_CHAR[95]; // there are 95 printable ascii chars


void catnip_strings_init();

#endif
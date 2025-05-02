
#ifndef CATNIP_STRINGS_H_INCLUDED
#define CATNIP_STRINGS_H_INCLUDED

#include "./catnip.h"

extern catnip_hstring *CATNIP_STRING_BLANK;
extern catnip_hstring *CATNIP_STRING_NAN;
extern catnip_hstring *CATNIP_STRING_POS_INFINITY;
extern catnip_hstring *CATNIP_STRING_NEG_INFINITY;


void catnip_strings_init();

#endif
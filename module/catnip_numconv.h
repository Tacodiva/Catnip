
#ifndef CATNIP_NUMCONV_H_INCLUDED
#define CATNIP_NUMCONV_H_INCLUDED

#include "./catnip.h"

catnip_f64_t catnip_numconv_parse(catnip_hstring *str);
catnip_hstring *catnip_numconv_stringify(catnip_f64_t x);

#endif
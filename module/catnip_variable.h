


#ifndef CATNIP_VARIABLE_H_INCLUDED
#define CATNIP_VARIABLE_H_INCLUDED

#include "./catnip.h"

struct catnip_variable {

    catnip_hstring *name;
    catnip_value default_value;
    
};

typedef struct catnip_variable catnip_variable;

#endif
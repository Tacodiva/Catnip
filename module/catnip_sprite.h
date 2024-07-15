
#ifndef CATNIP_SPRITE_H_INCLUDED
#define CATNIP_SPRITE_H_INCLUDED

#include "./catnip.h"

struct catnip_sprite {

    catnip_hstring *name;

    catnip_ui32_t variable_count;
    catnip_variable **variables;
    
};

typedef struct catnip_sprite catnip_sprite;


#endif
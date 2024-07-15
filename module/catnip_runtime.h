
#ifndef CATNIP_RUNTIME_H_INCLUDED
#define CATNIP_RUNTIME_H_INCLUDED

#include "./catnip.h"

struct catnip_runtime {

    catnip_ui32_t sprite_count;
    catnip_sprite **sprites;

    catnip_list targets; // list of catnip_target*

};

typedef struct catnip_runtime catnip_runtime;

catnip_runtime *catnip_runtime_new();

#endif
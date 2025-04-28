#ifndef CATNIPR_CANVAS_H_INCLUDED
#define CATNIPR_CANVAS_H_INCLUDED

#include "catnip.h"

struct catnip_costume {
    catnip_hstring *name;
    
    catnip_f32_t aabb_left;
    catnip_f32_t aabb_right;
    catnip_f32_t aabb_top;
    catnip_f32_t aabb_bottom;
};

#endif
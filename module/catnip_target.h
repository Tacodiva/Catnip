
#ifndef CATNIP_TARGET_H_INCLUDED
#define CATNIP_TARGET_H_INCLUDED

#include "./catnip.h"

typedef catnip_ui32_t catnip_target_flags;

#define CATNIP_TARGET_FLAG(x) (1 << (x))

#define CATNIP_TARGET_FLAG_IS_CLONE CATNIP_TARGET_FLAG(0)
#define CATNIP_TARGET_FLAG_IS_STAGE CATNIP_TARGET_FLAG(1)
#define CATNIP_TARGET_FLAG_IS_VISIBLE CATNIP_TARGET_FLAG(2)

struct catnip_target;
typedef struct catnip_target catnip_target;

struct catnip_target {
    catnip_runtime *runtime;
    catnip_sprite *sprite;
    catnip_target_flags flags;

    catnip_target *next_global;
    catnip_target *prev_global;

    catnip_target *next_sprite;
    catnip_target *prev_sprite;

    catnip_value *variable_table;
    catnip_list *list_table;

    catnip_f64_t position_x;
    catnip_f64_t position_y;
    catnip_f64_t direction;
    catnip_f64_t size;
    catnip_ui32_t costume;

    catnip_bool_t pen_down;
    catnip_f32_t pen_thickness;
    
    catnip_bool_t pen_argb_valid;
    catnip_ui32_t pen_argb;

    catnip_bool_t pen_thsv_valid;
    catnip_f64_t pen_transparency;
    catnip_f64_t pen_hue;
    catnip_f64_t pen_satuation;
    catnip_f64_t pen_value;
    
    catnip_f64_t effect_color;
    catnip_f64_t effect_fisheye;
    catnip_f64_t effect_whirl;
    catnip_f64_t effect_pixelate;
    catnip_f64_t effect_mosaic;
    catnip_f64_t effect_brightness;
    catnip_f64_t effect_ghost;


    catnip_i32_t volume;
    catnip_i32_t tempo;
};

catnip_target *catnip_target_new(struct catnip_runtime *runtime, catnip_sprite *sprite);
void catnip_target_start_new_thread(catnip_target *target, catnip_thread_fnptr entrypoint, catnip_list *threadList);
void catnip_target_set_xy(catnip_target* target, catnip_f64_t x, catnip_f64_t y);

#endif
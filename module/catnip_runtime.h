
#ifndef CATNIP_RUNTIME_H_INCLUDED
#define CATNIP_RUNTIME_H_INCLUDED

#include "./catnip.h"


struct catnip_pen_line {
    catnip_f32_t color_r;
    catnip_f32_t color_g;
    catnip_f32_t color_b;
    catnip_f32_t color_a;

    catnip_f32_t thickness;
    catnip_f32_t length;

    catnip_f32_t xpos_a;
    catnip_f32_t ypos_a;

    catnip_f32_t xpos_b;
    catnip_f32_t ypos_b;
};

typedef struct catnip_pen_line catnip_pen_line;

struct catnip_costume {
    catnip_hstring *name;
    
    catnip_f32_t aabbLeft;
    catnip_f32_t aabbRight;
    catnip_f32_t aabbTop;
    catnip_f32_t aabbBottom;
};

typedef struct catnip_costume catnip_costume;

#define CATNIP_PEN_LINE_BUFFER_SIZE 2048

struct catnip_runtime {

    catnip_ui32_t sprite_count;
    catnip_sprite **sprites;

    catnip_target *targets; // head of linked list
    catnip_list threads; // list of catnip_thread*

    catnip_ui32_t pen_line_buffer_length;
    catnip_pen_line *pen_line_buffer;
};

catnip_runtime *catnip_runtime_new();
void catnip_runtime_tick(catnip_runtime *runtime);
void catnip_runtime_start_threads(catnip_runtime *runtime, catnip_sprite *sprite, catnip_thread_fnptr entrypoint, catnip_list *threadList);

#endif
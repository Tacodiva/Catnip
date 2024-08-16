

#ifndef CATNIPR_CANVAS_H_INCLUDED
#define CATNIPR_CANVAS_H_INCLUDED

#include "./catnipr.h"

struct catnipr_pen_line {
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

typedef struct catnipr_pen_line catnipr_pen_line;

#define PEN_LINE_BUFFER_SIZE 2048

struct catnipr_canvas {

    catnip_i32_t pen_line_count;
    catnipr_pen_line *pen_lines;

    
};

typedef struct catnipr_canvas catnipr_canvas;


#endif
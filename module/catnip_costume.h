

#ifndef CATNIPR_CANVAS_H_INCLUDED
#define CATNIPR_CANVAS_H_INCLUDED

#include "./catnipr.h"


struct catnipr_canvas {

    catnip_i32_t pen_line_count;
    catnipr_pen_line *pen_lines;

    
};

typedef struct catnipr_canvas catnipr_canvas;


#endif

#include "./catnipr_canvas.h"

catnipr_canvas *catnipr_canvas_init() {

    catnipr_canvas *canvas = catnip_mem_alloc(sizeof(catnipr_canvas));

    canvas->pen_line_count = 0;
    canvas->pen_lines = catnip_mem_alloc(sizeof(catnipr_pen_line) * PEN_LINE_BUFFER_SIZE);

    return canvas;
}

void catnipr_canvas_pen_draw_line(
    catnipr_canvas *canvas,
    catnip_f32_t x0, catnip_f32_t y0,
    catnip_f32_t x1, catnip_f32_t y1,
    catnip_f32_t r, catnip_f32_t g, catnip_f32_t b, catnip_f32_t a,
    catnip_f32_t diameter
) {
    
    
}
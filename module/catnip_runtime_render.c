#include "./catnip_runtime.h"

void catnip_runtime_render_pen_draw_line(
    catnip_runtime *runtime,
    catnip_target_pen_state *state,
    catnip_i32_t x0,
    catnip_i32_t y0,
    catnip_i32_t x1,
    catnip_i32_t y1
) {
    
    catnip_pen_line *line = &runtime->pen_line_buffer[runtime->pen_line_buffer_length++];

    line->color_r = state->r * state->a;
    line->color_g = state->g * state->a;
    line->color_b = state->b * state->a;
    line->color_a = state->a;
    
    line->thickness = state->thickness;

    const catnip_i32_t lineDiffX = x1 - x0;
    const catnip_i32_t lineDiffY = y1 - y0;

    line->length = CATNIP_F32_SQRT((lineDiffX * lineDiffX) + (lineDiffY * lineDiffY));

    line->xpos_a = x0;
    line->ypos_a = -y0;

    line->xpos_b = lineDiffX;
    line->ypos_b = -lineDiffY;

    catnip_import_render_pen_draw_lines(runtime->pen_line_buffer, 1);
    runtime->pen_line_buffer_length = 0;

}
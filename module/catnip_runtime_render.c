#include "./catnip_runtime.h"

void catnip_runtime_render_pen_flush(catnip_runtime *runtime) {
    if (runtime->pen_line_buffer_length == 0) return;
    catnip_import_render_pen_draw_lines(runtime->pen_line_buffer, runtime->pen_line_buffer_length);
    runtime->pen_line_buffer_length = 0;
}

void catnip_runtime_render_pen_draw_line(
    catnip_runtime *runtime,
    catnip_target *target,
    catnip_f32_t x0,
    catnip_f32_t y0,
    catnip_f32_t x1,
    catnip_f32_t y1
) {
    
    if (!target->pen_argb_valid) {
        catnip_blockutil_pen_update_argb(target);
    }

    catnip_pen_line *line = &runtime->pen_line_buffer[runtime->pen_line_buffer_length++];

    // const catnip_ui32_t a = ((target->pen_argb >> 24) & 0xFF) / 255.0;
    const catnip_f32_t a = 1;
    const catnip_f32_t r = ((target->pen_argb >> 16) & 0xFF) / 255.0;
    const catnip_f32_t g = ((target->pen_argb >> 8) & 0xFF) / 255.0;
    const catnip_f32_t b = ((target->pen_argb >> 0) & 0xFF) / 255.0;

    line->color_r = r * a;
    line->color_g = g * a;
    line->color_b = b * a;
    line->color_a = a;
    
    line->thickness = target->pen_thickness;

    const catnip_f32_t lineDiffX = x1 - x0;
    const catnip_f32_t lineDiffY = y1 - y0;

    line->length = CATNIP_F32_SQRT((lineDiffX * lineDiffX) + (lineDiffY * lineDiffY));

    line->xpos_a = x0;
    line->ypos_a = y0;

    line->xpos_b = lineDiffX;
    line->ypos_b = lineDiffY;

    if (runtime->pen_line_buffer_length >= CATNIP_RENDER_PEN_LINE_BUFFER_SIZE) {
        catnip_runtime_render_pen_flush(runtime);
    }
}
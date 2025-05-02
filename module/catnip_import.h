
#ifndef CATNIP_EXTERNAL_H_INCLUDED
#define CATNIP_EXTERNAL_H_INCLUDED

#include "./catnip.h"

void CATNIP_IMPORT(catnip_import_log)(const catnip_wchar_t *str_ptr, catnip_ui32_t str_length);
void CATNIP_IMPORT(catnip_import_render_pen_draw_lines)(const catnip_pen_line *lines, catnip_ui32_t line_length);

#endif
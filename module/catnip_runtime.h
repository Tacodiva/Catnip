
#ifndef CATNIP_RUNTIME_H_INCLUDED
#define CATNIP_RUNTIME_H_INCLUDED

#include "./catnip.h"

#define CATNIP_RENDER_PEN_LINE_BUFFER_SIZE 16384

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

#define CATNIP_HEAP_PAGE_MAGIC 0x1EE7

struct catnip_gc_page {
    void *end;
    void *current;
    void *next_current; // Used during GC
    catnip_ui32_t magic; // Used to align this page and also be a magic value
};

typedef struct catnip_gc_page catnip_gc_page;

struct catnip_runtime_gc_stats {
    catnip_ui32_t total_memory; // Total memory (including large objects)
    catnip_ui32_t total_page_memory; // Total memory used by pages
    catnip_ui32_t total_used_page_memory; // Total memory occupied in the pages

    catnip_ui32_t num_pages;
    catnip_ui32_t num_lrg_objs;
    catnip_ui32_t num_sml_objs;

    catnip_ui32_t latest_peak_memory;
    catnip_ui32_t latest_gc_root_count;
    catnip_ui32_t latest_freed_sml_obj_count;
    catnip_ui32_t latest_freed_lrg_obj_count;
    catnip_ui32_t latest_moved_sml_obj_count;
    catnip_ui32_t latest_moved_pointer_count;
    catnip_ui32_t latest_freed_pages;
};

typedef struct catnip_runtime_gc_stats catnip_runtime_gc_stats;

#define CATNIP_HEAP_PAGE_SIZE_BYTES 10485760
#define CATNIP_HEAP_LARGE_OBJ_SIZE 262144

struct catnip_runtime {

    catnip_ui32_t sprite_count;
    catnip_sprite **sprites;

    catnip_target *targets; // head of linked list
    
    catnip_list threads; // list of catnip_thread*
    catnip_ui32_t num_active_threads;

    catnip_runtime_gc_stats *gc_stats; // Only if CATNIP_GC_STATS is defined, updated after a GC
    catnip_i32_t gc_page_index;
    catnip_gc_page *gc_page;
    catnip_list gc_pages;
    catnip_list gc_large_objs;

    catnip_ui32_t pen_line_buffer_length;
    catnip_pen_line *pen_line_buffer;

    catnip_io *io;
    catnip_math_random_state* random_state;
};

catnip_runtime *catnip_runtime_new();
void catnip_runtime_tick(catnip_runtime *runtime);
void catnip_runtime_start_threads(catnip_runtime *runtime, catnip_sprite *sprite, catnip_thread_fnptr entrypoint, catnip_list *threadList);
catnip_obj_head *catnip_runtime_gc_new_obj(catnip_runtime *runtime, catnip_ui32_t size);
catnip_obj_head *catnip_gc_new_immortal(catnip_ui32_t size);
void catnip_runtime_gc(catnip_runtime *runtime);
void catnip_runtime_render_pen_draw_line( catnip_runtime *runtime, catnip_target *target, catnip_i32_t x0, catnip_i32_t y0, catnip_i32_t x1, catnip_i32_t y1);
void catnip_runtime_render_pen_flush(catnip_runtime *runtime);

#endif
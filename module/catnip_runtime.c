
#include "./catnip_runtime.h"

#include "./catnip_runtime_gc.c"
#include "./catnip_runtime_render.c"

catnip_runtime *catnip_runtime_new() {

  catnip_runtime *rt = catnip_mem_alloc(sizeof(catnip_runtime));

  rt->sprite_count = 0;
  rt->sprites = CATNIP_NULL;

  rt->targets = CATNIP_NULL;

  CATNIP_LIST_INIT(&rt->threads, catnip_thread *, 8);
  rt->num_active_threads = 0;

  rt->gc_page_index = -1;
  rt->gc_page = CATNIP_NULL;
  CATNIP_LIST_INIT(&rt->gc_pages, catnip_gc_page *, 4);
  CATNIP_LIST_INIT(&rt->gc_large_objs, catnip_obj_head *, 0);

#ifdef CATNIP_GC_STATS
  rt->gc_stats = catnip_mem_alloc(sizeof(catnip_runtime_gc_stats));
  catnip_mem_zero(rt->gc_stats, sizeof(catnip_runtime_gc_stats));
#endif

  rt->pen_line_buffer = catnip_mem_alloc(sizeof(catnip_pen_line) * CATNIP_RENDER_PEN_LINE_BUFFER_SIZE);
  rt->pen_line_buffer_length = 0;

  return rt;
}

void catnip_runtime_tick(catnip_runtime *runtime) {
  CATNIP_ASSERT(runtime != CATNIP_NULL);

  runtime->num_active_threads = 0;

  for (catnip_i32_t i = 0; i < CATNIP_LIST_LENGTH(&runtime->threads, catnip_thread *); i++) {

    catnip_thread *thread = CATNIP_LIST_GET(&runtime->threads, catnip_thread *, i);

    if (thread->status == CATNIP_THREAD_STATUS_YIELD) {
      thread->status = CATNIP_THREAD_STATUS_RUNNING;
    }

    if (thread->status == CATNIP_THREAD_STATUS_YIELD_TICK) {
      thread->status = CATNIP_THREAD_STATUS_RUNNING;
    }

    catnip_i32_t lc = 0;

    while (thread->status == CATNIP_THREAD_STATUS_RUNNING) {
      thread->function(thread);

      if (++lc > 100000000)
        CATNIP_ASSERT(CATNIP_FALSE);
    }

    if (thread->status != CATNIP_THREAD_STATUS_TERMINATED) 
      ++runtime->num_active_threads;
  }

  catnip_runtime_gc(runtime);

  catnip_target_pen_state state;

  state.r = 1;
  state.g = 0.5;
  state.b = 0;
  state.a = 1;
  state.thickness = 10;

  catnip_runtime_render_pen_draw_line(runtime, &state, 0, 0, 100, 100);
}

void catnip_runtime_start_threads(catnip_runtime *runtime, catnip_sprite *sprite, catnip_thread_fnptr entrypoint, catnip_list *threadList) {

  catnip_target *target = sprite->target;

  while (target != CATNIP_NULL) {

    catnip_thread *newThread = catnip_thread_new(target, entrypoint);

    if (threadList != CATNIP_NULL)
      CATNIP_LIST_ADD(threadList, catnip_thread*, newThread);

    target = target->next_sprite;
  }
}


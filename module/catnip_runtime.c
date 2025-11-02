
#include "./catnip_runtime.h"

#include "./catnip_runtime_gc.c"
#include "./catnip_runtime_render.c"

catnip_ui64_t update_time(catnip_runtime *rt) {
  return rt->time = catnip_import_time();
}

catnip_runtime *catnip_runtime_new() {

  catnip_runtime *rt = catnip_mem_alloc(sizeof(catnip_runtime));

  rt->sprite_count = 0;
  rt->sprites = CATNIP_NULL;

  rt->targets = CATNIP_NULL;

  CATNIP_LIST_INIT(&rt->threads, catnip_thread *, 8);

  rt->gc_requested = CATNIP_FALSE;
  rt->gc_index = 0;
  rt->gc_page_index = -1;
  rt->gc_page = CATNIP_NULL;
  rt->gc_max_pages = 3;
  CATNIP_LIST_INIT(&rt->gc_pages, catnip_gc_page *, 4);
  CATNIP_LIST_INIT(&rt->gc_large_objs, catnip_obj_head *, 0);

#ifdef CATNIP_GC_STATS
  rt->gc_stats = catnip_mem_alloc(sizeof(catnip_runtime_gc_stats));
  catnip_mem_zero(rt->gc_stats, sizeof(catnip_runtime_gc_stats));
#endif

  rt->pen_line_buffer = catnip_mem_alloc(sizeof(catnip_pen_line) * CATNIP_RENDER_PEN_LINE_BUFFER_SIZE);
  rt->pen_line_buffer_length = 0;

  rt->io = catnip_mem_alloc(sizeof(catnip_io));
  catnip_mem_zero(rt->io, sizeof(catnip_io));

  rt->random_state = catnip_mem_alloc(sizeof(catnip_math_random_state));
  
  update_time(rt);
  rt->timer_start = rt->time;

  return rt;
}

void cull_terminated_thread(catnip_list *threadList) {
  for (catnip_i32_t i = CATNIP_LIST_LENGTH(threadList, catnip_thread *) - 1; i >= 0; i--) {
    catnip_thread *thread = CATNIP_LIST_GET(threadList, catnip_thread *, i);

    if (thread->status != CATNIP_THREAD_STATUS_TERMINATED) continue;

    CATNIP_LIST_REMOVE(threadList, catnip_thread *, i);
    catnip_thread_dereference(thread);
  }
}

void catnip_runtime_tick(catnip_runtime *runtime) {
  CATNIP_ASSERT(runtime != CATNIP_NULL);

  update_time(runtime);

  catnip_ui64_t tickStartTime = runtime->time;
  catnip_bool_t ranFirstTick = CATNIP_FALSE;

  runtime->redraw_requested = CATNIP_FALSE;
  catnip_i32_t numActiveThreads = CATNIP_LIST_LENGTH(&runtime->threads, catnip_thread *);
  
  while ((numActiveThreads != 0) &&
        (!runtime->redraw_requested || runtime->cfg_turbomode) && 
        ((catnip_import_time() - tickStartTime) < runtime->cfg_tick_time)) {

    numActiveThreads = 0;

    for (catnip_i32_t i = 0; i < CATNIP_LIST_LENGTH(&runtime->threads, catnip_thread *); i++) {

      catnip_thread *thread = CATNIP_LIST_GET(&runtime->threads, catnip_thread *, i);

      if (thread->status == CATNIP_THREAD_STATUS_YIELD) {
        thread->status = CATNIP_THREAD_STATUS_RUNNING;
      }

      if (thread->status == CATNIP_THREAD_STATUS_YIELD_TICK && !ranFirstTick) {
        thread->status = CATNIP_THREAD_STATUS_RUNNING;
      }

      if (thread->status == CATNIP_THREAD_STATUS_WAIT_FOR_THREADS) {
        cull_terminated_thread(&thread->wait_for_threads);

        if (CATNIP_LIST_LENGTH(&thread->wait_for_threads, catnip_thread *) == 0) {
          thread->status = CATNIP_THREAD_STATUS_RUNNING;
        }
      }

      catnip_i32_t lc = 0;

      while (thread->status == CATNIP_THREAD_STATUS_RUNNING) {
        thread->function(thread);

        if (runtime->cfg_turbomode && thread->status == CATNIP_THREAD_STATUS_YIELD) {
          // If the warp timer is not up, we keep running the thread
          if ((catnip_import_time() - tickStartTime) < runtime->cfg_tick_time) {
            thread->status = CATNIP_THREAD_STATUS_RUNNING;
          }
        }

        if (thread->status == CATNIP_THREAD_STATUS_WAIT_FOR_THREADS) {
          if (CATNIP_LIST_LENGTH(&thread->wait_for_threads, catnip_thread *) == 0) {
            // If we aren't actually waiting for any threads, keep running immediatly.
            thread->status = CATNIP_THREAD_STATUS_RUNNING;
          }
        }

        if (runtime->gc_requested)
          catnip_runtime_gc(runtime);

        if (++lc > 100000000)
          CATNIP_ASSERT(CATNIP_FALSE);
      }

      if (thread->status == CATNIP_THREAD_STATUS_RUNNING || thread->status == CATNIP_THREAD_STATUS_YIELD) 
        ++numActiveThreads;
    }

    ranFirstTick = CATNIP_TRUE;
  }

  cull_terminated_thread(&runtime->threads);
}

void catnip_runtime_start_threads(catnip_runtime *runtime, catnip_sprite *sprite, catnip_thread_fnptr entrypoint, catnip_thread *waitingThread) {

  catnip_target *target = sprite->target;

  while (target != CATNIP_NULL) {

    catnip_thread *newThread = catnip_thread_new(target, entrypoint);

    if (waitingThread != CATNIP_NULL) {
      ++newThread->ref_count;
      CATNIP_LIST_ADD(&waitingThread->wait_for_threads, catnip_thread*, newThread);
    }

    target = target->next_sprite;
  }
}

catnip_bool_t catnip_runtime_has_running_threads(catnip_runtime *runtime) {
  for (catnip_i32_t i = 0; i < CATNIP_LIST_LENGTH(&runtime->threads, catnip_thread *); i++) {
  
    catnip_thread *thread = CATNIP_LIST_GET(&runtime->threads, catnip_thread *, i);

    if (thread->status != CATNIP_THREAD_STATUS_TERMINATED) {
      return CATNIP_TRUE;
    }
  }

  return CATNIP_FALSE;
}

#include "./catnip_runtime.h"

catnip_runtime *catnip_runtime_new() {

  catnip_runtime *rt = catnip_mem_alloc(sizeof(catnip_runtime));

  rt->sprite_count = 0;
  rt->sprites = CATNIP_NULL;

  rt->targets = CATNIP_NULL;
  CATNIP_LIST_INIT(&rt->threads, catnip_thread *, 8);

  return rt;
}

void catnip_runtime_tick(catnip_runtime *runtime) {
  CATNIP_ASSERT(runtime != CATNIP_NULL);

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
  }
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
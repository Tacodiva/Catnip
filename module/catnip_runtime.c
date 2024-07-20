
#include "./catnip_runtime.h"

catnip_runtime *catnip_runtime_new() {

  catnip_runtime *rt = catnip_mem_alloc(sizeof(catnip_runtime));

  rt->sprite_count = 0;
  rt->sprites = CATNIP_NULL;

  CATNIP_LIST_INIT(&rt->targets, catnip_target*, 8);
  CATNIP_LIST_INIT(&rt->threads, catnip_thread*, 8);

  return rt;
}

void catnip_runtime_tick(catnip_runtime *runtime) {
  CATNIP_ASSERT(runtime != CATNIP_NULL);

  for (catnip_i32_t i = 0; i < CATNIP_LIST_LENGTH(&runtime->threads, catnip_thread*); i++) {

    catnip_thread *thread = CATNIP_LIST_GET(&runtime->threads, catnip_thread*, i);

    if (thread->status == CATNIP_THREAD_STATUS_YIELD) {
      thread->status = CATNIP_THREAD_STATUS_RUNNING;
    }

    while (thread->status == CATNIP_THREAD_STATUS_RUNNING) {
      thread->function(thread);
    }

  }
}
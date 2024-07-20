
#include "./catnip.h"

catnip_thread *catnip_thread_new(catnip_target *target, catnip_thread_fnptr entrypoint) {
  CATNIP_ASSERT(target != CATNIP_NULL);
  CATNIP_ASSERT(entrypoint != CATNIP_NULL);

  catnip_thread *thread = catnip_mem_alloc(sizeof(catnip_thread));

  thread->runtime = target->runtime;
  thread->function = entrypoint;
  thread->target = target;
  thread->status = CATNIP_THREAD_STATUS_RUNNING;

  CATNIP_LIST_ADD(&thread->runtime->threads, catnip_thread *, thread);

  return thread;
}

void catnip_thread_yield(catnip_thread *thread, catnip_thread_fnptr dst) {
  CATNIP_ASSERT(thread != CATNIP_NULL);
  CATNIP_ASSERT(dst != CATNIP_NULL);

  thread->function = dst;
  thread->status = CATNIP_THREAD_STATUS_YIELD;
}

void catnip_thread_terminate(catnip_thread *thread) {
  CATNIP_ASSERT(thread != CATNIP_NULL);
  thread->status = CATNIP_THREAD_STATUS_TERMINATED;
}
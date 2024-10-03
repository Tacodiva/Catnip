

#ifndef CATNIP_THREAD_H_INCLUDED
#define CATNIP_THREAD_H_INCLUDED

#include "./catnip.h"

typedef catnip_ui32_t catnip_thread_status;

#define CATNIP_THREAD_STATUS_RUNNING 0
#define CATNIP_THREAD_STATUS_YIELD 1
#define CATNIP_THREAD_STATUS_YIELD_TICK 2
#define CATNIP_THREAD_STATUS_TERMINATED 3

struct catnip_thread;
typedef struct catnip_thread catnip_thread;

struct catnip_thread {

  catnip_runtime *runtime;
  catnip_target *target;
  catnip_thread_fnptr function;
  catnip_thread_status status;

  void *stack_ptr;
  void *stack_end;
  void *stack_start;
};

catnip_thread *catnip_thread_new(catnip_target *target, catnip_thread_fnptr entrypoint);
void catnip_thread_yield(catnip_thread *thread, catnip_thread_fnptr dst);
void catnip_thread_terminate(catnip_thread *thread);
void catnip_thread_resize_stack(catnip_thread *thread, catnip_ui32_t extraCapacity);
void *catnip_thread_allocate_stack(catnip_thread *thread, catnip_ui32_t capacity);
#endif

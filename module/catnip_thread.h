

#ifndef CATNIP_THREAD_H_INCLUDED
#define CATNIP_THREAD_H_INCLUDED

#include "./catnip.h"

typedef catnip_ui32_t catnip_thread_status;

#define CATNIP_THREAD_STATUS_RUNNING 0
#define CATNIP_THREAD_STATUS_YIELD 1
#define CATNIP_THREAD_STATUS_YIELD_TICK 2
#define CATNIP_THREAD_STATUS_TERMINATED 3
#define CATNIP_THREAD_STATUS_WAIT_FOR_THREADS 4

struct catnip_thread;
typedef struct catnip_thread catnip_thread;

struct catnip_thread {
  catnip_runtime *runtime;
  catnip_target *target;
  
  catnip_thread_fnptr function;
  catnip_thread_status status;

  catnip_i32_t ref_count;
  catnip_list wait_for_threads; // list of catnip_thread*

  catnip_value *stack_ptr;
  catnip_value *stack_end;
  catnip_value *stack_start;
};

catnip_thread *catnip_thread_new(catnip_target *target, catnip_thread_fnptr entrypoint);
void catnip_thread_yield(catnip_thread *thread, catnip_thread_fnptr dst);
void catnip_thread_terminate(catnip_thread *thread);
void catnip_thread_resize_stack(catnip_thread *thread, catnip_ui32_t extraCapacity);
void *catnip_thread_allocate_stack(catnip_thread *thread, catnip_ui32_t capacity);
void catnip_thread_dereference(catnip_thread *thread);
void catnip_thread_free(catnip_thread *thread);
#endif

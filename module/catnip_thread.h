

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

typedef void (*catnip_thread_fnptr)(catnip_thread *thread);

struct catnip_thread {

  struct catnip_runtime *runtime;
  catnip_target *target;
  catnip_thread_fnptr function;
  catnip_thread_status status;

  catnip_value *stack_ptr;
  catnip_value *stack_start;
  catnip_value *stack_end;
};

catnip_thread *catnip_thread_new(catnip_target *target, catnip_thread_fnptr entrypoint);
void catnip_thread_yield(catnip_thread *thread, catnip_thread_fnptr dst);
void catnip_thread_terminate(catnip_thread *thread);

#endif

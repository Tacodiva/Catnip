

#ifndef CATNIP_THREAD_H_INCLUDED
#define CATNIP_THREAD_H_INCLUDED

#include "./catnip.h"

typedef catnip_ui32_t catnip_thread_status;

#define CATNIP_THREAD_STATUS_RUNNING 0
#define CATNIP_THREAD_STATUS_YIELD 1
#define CATNIP_THREAD_STATUS_YIELD_TICK 2

struct catnip_thread;
typedef struct catnip_thread catnip_thread;

typedef void (*catnip_compiled_fn)(catnip_thread *thread);

struct catnip_thread {

    catnip_target *target;
    catnip_compiled_fn function;
    catnip_thread_status status;

    catnip_value *stack_ptr;
    catnip_value *stack_start;
    catnip_value *stack_end;
    
};


#endif

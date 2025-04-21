
#ifndef CATNIP_H_INCLUDED
#define CATNIP_H_INCLUDED

#ifdef CATNIP_DEBUG
#define CATNIP_GC_STATS
#endif

// #define CATNIP_GC_DISABLE

#define CATNIP_EXPORT(name) __attribute__((export_name(#name))) catnip_export_ ## name
#define CATNIP_IMPORT(name) __attribute__((import_module("catnip"), import_name(#name))) name

typedef signed int catnip_i32_t;
typedef unsigned int catnip_ui32_t;

typedef signed long long catnip_i64_t;
typedef unsigned long long catnip_ui64_t;

typedef signed short catnip_i16_t;
typedef unsigned short catnip_ui16_t;

typedef float catnip_f32_t;
typedef double catnip_f64_t;

typedef int catnip_bool_t;

#define CATNIP_TRUE (1==1)
#define CATNIP_FALSE (!CATNIP_TRUE)

#define CATNIP_NULL 0

#define CATNIP_F64_INFINITY __builtin_inf()
#define CATNIP_F64_NAN __builtin_nan("")
#define CATNIP_F64_ISNAN(x) __builtin_isnan(x)
#define CATNIP_F64_ISINFINITE(x) __builtin_isinf(x)
#define CATNIP_F64_SIGNBIT(x) __builtin_signbit(x)

#define CATNIP_F32_SQRT(x) __builtin_sqrt(x)
#define CATNIP_F64_SQRT(x) __builtin_sqrt(x)

typedef catnip_i32_t catnip_codepoint_t;

typedef char catnip_char_t;
typedef unsigned char catnip_uchar_t;


#ifdef CATNIP_DEBUG
void catnip_assert(catnip_bool_t assertion, const char* name, const char* func, const char* file, catnip_ui32_t line);
#define CATNIP_ASSERT(assertion) catnip_assert(assertion, #assertion, __func__, __FILE__, __LINE__)
#else
#define CATNIP_ASSERT(assertion)
#endif

typedef struct catnip_runtime catnip_runtime;
typedef struct catnip_target catnip_target;
typedef struct catnip_sprite catnip_sprite;
typedef struct catnip_thread catnip_thread;
typedef struct catnip_costume catnip_costume;
typedef struct catnip_pen_line catnip_pen_line;
typedef void (*catnip_thread_fnptr)(catnip_thread *thread);

#include "./catnip_obj_head.h"
#include "./catnip_util.h"
#include "./catnip_list.h"
#include "./catnip_mem.h"
#include "./catnip_unicode.h"
#include "./catnip_hstring.h"
#include "./catnip_import.h"
#include "./catnip_numconv.h"
#include "./catnip_value.h"
#include "./catnip_variable.h"
#include "./catnip_sprite.h"
#include "./catnip_target.h"
#include "./catnip_thread.h"
#include "./catnip_runtime.h"
#include "./catnip_blockutil.h"

#endif
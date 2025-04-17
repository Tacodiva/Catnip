#ifndef CATNIP_OBJ_HEAD_H_INCLUDED
#define CATNIP_OBJ_HEAD_H_INCLUDED

#include "./catnip.h"

#define CATNIP_OBJ_HEAD_MAGIC 0x7729

typedef struct catnip_obj_head catnip_obj_head;

struct catnip_obj_head {
  catnip_ui32_t refcount;
  catnip_ui32_t bytelen;
  catnip_obj_head *move_ptr; // The pointer this object is being moved to, or where it is currently if it hasn't been moved
  catnip_ui16_t extern_refcount; // How many references to this object exist outside stuff we check
  catnip_ui16_t magic; // Used to make this struct 64-bit aligned, also sanity check magic number incase of memory corruption
};

#endif
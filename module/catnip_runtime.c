
#include "./catnip_runtime.h"

catnip_runtime *catnip_runtime_new() {

  catnip_runtime *rt = catnip_mem_alloc(sizeof(catnip_runtime));

  rt->sprite_count = 0;
  rt->sprites = CATNIP_NULL;

  CATNIP_LIST_INIT(&rt->targets, catnip_target*, 4);

  return rt;
}
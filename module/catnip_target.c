
#include "./catnip.h"

catnip_target *catnip_target_new(struct catnip_runtime *runtime, catnip_sprite *sprite) {
  CATNIP_ASSERT(runtime != CATNIP_NULL);
  CATNIP_ASSERT(sprite != CATNIP_NULL);

  catnip_target *target = catnip_mem_alloc(sizeof(catnip_target));

  catnip_mem_zero(target, sizeof(catnip_target));

  target->runtime = runtime;
  target->sprite = sprite;
  
  target->variable_table = catnip_mem_alloc(sizeof(catnip_value) * sprite->variable_count);
  catnip_mem_zero(target->variable_table, sizeof(catnip_value) * sprite->variable_count);

  CATNIP_LIST_ADD(&runtime->targets, catnip_target*, target);

  target->next_sprite = sprite->target;
  target->prev_sprite = CATNIP_NULL;

  if (target->next_sprite != CATNIP_NULL) {
    target->next_sprite->prev_sprite = target;
  }

  return target;
}

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

  target->next_sprite = sprite->target;
  target->prev_sprite = CATNIP_NULL;
  sprite->target = target;

  if (target->next_sprite != CATNIP_NULL) {
    target->next_sprite->prev_sprite = target;
  }

  target->next_global = runtime->targets;
  target->prev_global = CATNIP_NULL;
  runtime->targets = target;

  if (target->next_global != CATNIP_NULL) {
    target->next_global->prev_global = target;
  }

  return target;
}

void catnip_target_start_new_thread(catnip_target *target, catnip_thread_fnptr entrypoint, catnip_list *threadList) {
  catnip_thread *newThread = catnip_thread_new(target, entrypoint);

  if (threadList != CATNIP_NULL)
    CATNIP_LIST_ADD(threadList, catnip_thread *, newThread);

  target = target->next_sprite;
}

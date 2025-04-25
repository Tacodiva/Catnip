
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

  target->list_table = catnip_mem_alloc(sizeof(catnip_list) * sprite->list_count);
  catnip_mem_zero(target->list_table, sizeof(catnip_list) * sprite->list_count);

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

  target->pen_down = CATNIP_FALSE;
  target->pen_argb_valid = CATNIP_TRUE;
  target->pen_argb = 0;
  target->pen_thickness = 1;
  
  return target;
}

void catnip_target_start_new_thread(catnip_target *target, catnip_thread_fnptr entrypoint, catnip_list *threadList) {
  catnip_thread *newThread = catnip_thread_new(target, entrypoint);

  if (threadList != CATNIP_NULL)
    CATNIP_LIST_ADD(threadList, catnip_thread *, newThread);

  target = target->next_sprite;
}

void catnip_target_set_xy(catnip_target* target, catnip_i32_t x, catnip_i32_t y) {

  // TODO We need to do fencing here, but that requires information about the costume we don't have yet.

  if (target->pen_down) {
    catnip_runtime_render_pen_draw_line(
      target->runtime,
      target,
      target->position_x,
      target->position_y,
      x,
      y
    );
  }

  target->position_x = x;
  target->position_y = y;
}
#ifndef CATNIP_LIST_H_INCLUDED
#define CATNIP_LIST_H_INCLUDED

#include "./catnip.h"

struct catnip_list {
  catnip_ui32_t length;
  catnip_ui32_t capacity;
  void *data;
};

typedef struct catnip_list catnip_list;

#define CATNIP_LIST_INIT(list, type, capacity) (catnip_list_init((list), sizeof(type), (capacity)))
void catnip_list_init(catnip_list *list, catnip_ui32_t item_size, catnip_ui32_t capacity);

#define CATNIP_LIST_FREE(list, type) (catnip_list_free((list), sizeof(type)))
void catnip_list_free(catnip_list *list, catnip_ui32_t item_size);

#define CATNIP_LIST_ADD(list, type, item) (catnip_list_push((list), sizeof(type), (void*) (&item)))
inline catnip_ui32_t catnip_list_push(catnip_list *list, catnip_ui32_t item_size, const void* item);

#define CATNIP_LIST_GET(list, type, index) (*((type*) catnip_list_get((list), sizeof(type), (index))))
inline void* catnip_list_get(catnip_list *list, catnip_ui32_t item_size, catnip_ui32_t index);

#define CATNIP_LIST_REMOVE(list, type, index) (catnip_list_remove((list), sizeof(type), (index)))
inline void catnip_list_remove(catnip_list *list, catnip_ui32_t item_size, catnip_ui32_t index);

#define CATNIP_LIST_LENGTH(list, type) (catnip_list_length((list)))
inline catnip_ui32_t catnip_list_length(catnip_list *list);

#endif
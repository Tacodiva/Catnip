
#include "./catnip.h"

#define CATNIP_ASSERT_LIST_VALID(list) CATNIP_ASSERT(catnip_list_is_valid(list))
#define CATNIP_ASSERT_LIST_INDEX_VALID(list, index) CATNIP_ASSERT(catnip_list_index_is_valid((list), (index)))

catnip_bool_t catnip_list_is_valid(catnip_list *list) {
  if (list == CATNIP_NULL)
    return CATNIP_FALSE;
  if (list->length >= list->capacity)
    return CATNIP_FALSE;
  return CATNIP_TRUE;
}

catnip_bool_t catnip_list_index_is_valid(catnip_list *list, catnip_ui32_t index) {
  return index < list->length;
}

catnip_list *catnip_list_new(catnip_ui32_t item_size, catnip_ui32_t capacity) {
  catnip_list *list = catnip_mem_alloc(sizeof(catnip_list));
  catnip_list_init(list, item_size, capacity);
  return list;
}

void catnip_list_init(catnip_list *list, catnip_ui32_t item_size, catnip_ui32_t capacity) {
  list->capacity = capacity;
  list->length = 0;
  if (capacity != 0)
    list->data = catnip_mem_alloc(capacity * item_size);
  CATNIP_ASSERT_LIST_VALID(list);
}

void catnip_list_free(catnip_list *list, catnip_ui32_t item_size) {
  CATNIP_ASSERT_LIST_VALID(list);
  if (list->capacity != 0)
    catnip_mem_free(list->data);
}

catnip_ui32_t catnip_list_push(catnip_list *list, catnip_ui32_t item_size, const void *item) {
  CATNIP_ASSERT_LIST_VALID(list);
  CATNIP_ASSERT(item != CATNIP_NULL);

  if (list->length == list->capacity) {
    list->capacity *= 2;
    void *new_data = catnip_mem_alloc(list->capacity * item_size);
    catnip_mem_copy(new_data, list->data, list->capacity * item_size);
    catnip_mem_free(list->data);
    list->data = new_data;
  }

  catnip_mem_copy(&list->data[list->length * item_size], item, item_size);
  return list->length++;
}

void *catnip_list_get(catnip_list *list, catnip_ui32_t item_size, catnip_ui32_t index) {
  CATNIP_ASSERT_LIST_VALID(list);
  CATNIP_ASSERT_LIST_INDEX_VALID(list, index);
  return &list->data[index * item_size];
}

void catnip_list_remove(catnip_list *list, catnip_ui32_t item_size, catnip_ui32_t index) {
  CATNIP_ASSERT_LIST_VALID(list);
  CATNIP_ASSERT_LIST_INDEX_VALID(list, index);
  const catnip_ui32_t byteIndex = index * item_size;
  catnip_mem_move(&list->data[byteIndex], &list->data[byteIndex + item_size], (list->length - index) * item_size);
  --list->length;
}

catnip_ui32_t catnip_list_length(catnip_list *list) {
  CATNIP_ASSERT_LIST_VALID(list);
  return list->length;
}

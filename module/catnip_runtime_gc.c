#include "./catnip_runtime.h"

#define CATNIP_ALIGN8(addr) (((catnip_ui32_t)(addr) + 7) & ~((catnip_ui32_t)7))

catnip_gc_page *gc_next_page(catnip_runtime *runtime) {

  ++runtime->gc_page_index;

  catnip_ui32_t heapPagesLen = CATNIP_LIST_LENGTH(&runtime->gc_pages, catnip_gc_page*);

  if (runtime->gc_page_index < heapPagesLen) {
    runtime->gc_page = CATNIP_LIST_GET(&runtime->gc_pages, catnip_gc_page*, runtime->gc_page_index);

    CATNIP_ASSERT(runtime->gc_page->magic == CATNIP_HEAP_PAGE_MAGIC);

    return runtime->gc_page;
  }

  // Allocate a new page

  CATNIP_ASSERT(CATNIP_HEAP_PAGE_SIZE_BYTES > sizeof(catnip_gc_page));

  void* pagePtr = catnip_mem_alloc(CATNIP_HEAP_PAGE_SIZE_BYTES);

  catnip_gc_page *page = pagePtr;

  void* pageDataStart = pagePtr + sizeof(catnip_gc_page);
  void* pageDataEnd = pagePtr + CATNIP_HEAP_PAGE_SIZE_BYTES;

  CATNIP_ASSERT(((catnip_ui32_t)pageDataStart & 7) == 0);

  page->current = pageDataStart;
  page->end = pageDataEnd;
#ifdef CATNIP_DEBUG
  page->magic = CATNIP_HEAP_PAGE_MAGIC;
#endif

  runtime->gc_page_index = heapPagesLen;
  runtime->gc_page = page;

  CATNIP_LIST_ADD(&runtime->gc_pages, catnip_gc_page*, page);

  #ifdef CATNIP_GC_STATS
  ++runtime->gc_stats->num_pages;
  runtime->gc_stats->total_page_memory += CATNIP_HEAP_PAGE_SIZE_BYTES;
  runtime->gc_stats->total_memory += CATNIP_HEAP_PAGE_SIZE_BYTES;
  #endif

  return page;
}

catnip_obj_head *catnip_gc_new_immortal(catnip_ui32_t size) {  
  CATNIP_ASSERT(size >= sizeof(catnip_obj_head));

  catnip_obj_head *objHead = catnip_mem_alloc(size);

  objHead->bytelen = size;
  objHead->refcount = 0;
  objHead->extern_refcount = 1;
  objHead->move_ptr = objHead;
#ifdef CATNIP_DEBUG
  objHead->magic = CATNIP_OBJ_HEAD_MAGIC;
#endif

  return objHead;
}

catnip_obj_head *catnip_runtime_gc_new_obj(catnip_runtime *runtime, catnip_ui32_t size) {
  CATNIP_ASSERT(size >= sizeof(catnip_obj_head));
  CATNIP_ASSERT(runtime != CATNIP_NULL);

  // All non-large objects need to be able to fit in a one heap page
  CATNIP_ASSERT(CATNIP_HEAP_LARGE_OBJ_SIZE < (CATNIP_HEAP_PAGE_SIZE_BYTES - sizeof(catnip_gc_page)));


  catnip_obj_head *objHead;

  if (size >= CATNIP_HEAP_LARGE_OBJ_SIZE) {
    // It's a large object, it lives in its own allocation

    objHead = catnip_mem_alloc(size);

    CATNIP_LIST_ADD(&runtime->gc_large_objs, catnip_obj_head*, objHead);

    #ifdef CATNIP_GC_STATS
    ++runtime->gc_stats->num_lrg_objs;
    runtime->gc_stats->total_memory += size;
    #endif
  } else {
    // We need to find a heap page to put the object on
    #ifdef CATNIP_GC_STATS
    ++runtime->gc_stats->num_sml_objs;
    runtime->gc_stats->total_used_page_memory += size;
    #endif

    catnip_ui32_t alignedSize = CATNIP_ALIGN8(size);

    catnip_gc_page *page = runtime->gc_page;
    void *start;
    void *end;

    if (page == CATNIP_NULL) {
      // Creating the first page
      page = gc_next_page(runtime);
      start = page->current;
      end = start + alignedSize;
    } else {

      start = page->current;
      end = start + alignedSize;

      if (end > page->end) {
        // The current page isn't big enough, move onto the next one
        page = gc_next_page(runtime);
        start = page->current;
        end = start + alignedSize;
      }
    }

    page->current = end;

    objHead = start;
  }

  CATNIP_ASSERT(objHead != CATNIP_NULL);

  objHead->bytelen = size;
  objHead->refcount = 0;
  objHead->extern_refcount = 0;
  objHead->move_ptr = objHead;
#ifdef CATNIP_DEBUG
  objHead->magic = CATNIP_OBJ_HEAD_MAGIC;
#endif

  return objHead;
}

#define CATNIP_RUNTIME_GC_PAGE_START(page) ((void *) (page)) + sizeof(catnip_gc_page)

// Loops through all the GC roots :3
void gc_iterate_roots(catnip_runtime *runtime, void(*func)(catnip_value*, catnip_runtime*)) {

  // First, all the targets to check their variables and lists
  catnip_target *target = runtime->targets;

  while (target != CATNIP_NULL) {

    // Check all the variables
    for (catnip_ui32_t varIdx = 0; varIdx < target->sprite->variable_count; varIdx++) {
      func(&target->variable_table[varIdx], runtime);
    }

    // TODO Check all the lists
    for (catnip_ui32_t listIdx = 0; listIdx < target->sprite->list_count; listIdx++) {
      
      catnip_list *list = &target->list_table[listIdx];

      for (catnip_ui32_t i = 0; i < CATNIP_LIST_LENGTH(list, catnip_value); i++) {
        catnip_value *value = CATNIP_LIST_GET_PTR_DANGER(list, catnip_value, i);
        func(value, runtime);
      }
    }

    target = target->next_global;
  }

  // Next, check the stacks of all the threads
  for (catnip_i32_t threadIdx = 0; threadIdx < CATNIP_LIST_LENGTH(&runtime->threads, catnip_thread *); threadIdx++) {
    catnip_thread *thread = CATNIP_LIST_GET(&runtime->threads, catnip_thread *, threadIdx);

    catnip_value *stackValue = thread->stack_start;

    while (stackValue < thread->stack_ptr) {
      func(stackValue, runtime);
      
      stackValue = ((void *) stackValue) + sizeof(catnip_value);
    }
  }
}

void gc_mark_root(catnip_value *value, catnip_runtime *runtime) {
  
  if (CATNIP_VALUE_IS_STRING(*value)) {

    catnip_obj_head *strHead = (catnip_obj_head *) value->parts.lower;

    CATNIP_ASSERT(strHead->magic == CATNIP_OBJ_HEAD_MAGIC);

    ++strHead->refcount;

    #ifdef CATNIP_GC_STATS
    ++runtime->gc_stats->latest_gc_root_count;
    #endif
  }

}

void gc_move_root(catnip_value *value, catnip_runtime *runtime) {

  if (CATNIP_VALUE_IS_STRING(*value)) {

    catnip_obj_head *strHead = (catnip_obj_head *) value->parts.lower;
    
    CATNIP_ASSERT(strHead->magic == CATNIP_OBJ_HEAD_MAGIC);
    CATNIP_ASSERT(strHead->move_ptr != CATNIP_NULL);

    #ifdef CATNIP_GC_STATS
    if (strHead->move_ptr != strHead)
      ++runtime->gc_stats->latest_moved_pointer_count;
    #endif

    value->parts.lower = (catnip_ui32_t) strHead->move_ptr;


  }
}

void catnip_runtime_gc(catnip_runtime *runtime) {

  #ifndef CATNIP_GC_DISABLE
  CATNIP_ASSERT(runtime != CATNIP_NULL);

  const catnip_ui32_t numberOfPages = CATNIP_LIST_LENGTH(&runtime->gc_pages, catnip_gc_page*);

  #ifdef CATNIP_GC_STATS

  if (runtime->gc_stats->total_memory > runtime->gc_stats->latest_peak_memory)
    runtime->gc_stats->latest_peak_memory = runtime->gc_stats->total_memory;
  
  runtime->gc_stats->total_memory = 0;
  runtime->gc_stats->total_used_page_memory = 0;
  runtime->gc_stats->num_sml_objs = 0;
  runtime->gc_stats->num_lrg_objs = 0;
  runtime->gc_stats->latest_gc_root_count = 0;
  runtime->gc_stats->latest_freed_sml_obj_count = 0;
  runtime->gc_stats->latest_freed_lrg_obj_count = 0;
  runtime->gc_stats->latest_moved_sml_obj_count = 0;
  runtime->gc_stats->latest_moved_sml_obj_count = 0;
  runtime->gc_stats->latest_moved_pointer_count = 0;
  runtime->gc_stats->latest_freed_pages = 0;
  #endif

  // First we need to "mark" everything we want to keep.
  gc_iterate_roots(runtime, &gc_mark_root);

  // Now we're gonna plan the moving and deleting we're gonna do
  
  // The page we're moving stuff to.
  catnip_ui32_t relocationPageIdx = 0;
  catnip_gc_page *relocationPage = CATNIP_NULL;

  if (numberOfPages != 0) {
    // The location we're moving stuff to, starts at the front of a page.
    relocationPage = CATNIP_LIST_GET(&runtime->gc_pages, catnip_gc_page*, relocationPageIdx);
    catnip_obj_head *relocationPtr = CATNIP_RUNTIME_GC_PAGE_START(relocationPage);

    for (catnip_ui32_t currentPageIdx = 0; currentPageIdx < numberOfPages; currentPageIdx++) {

      catnip_gc_page *currentPage = CATNIP_LIST_GET(&runtime->gc_pages, catnip_gc_page*, currentPageIdx);

      CATNIP_ASSERT(currentPage->magic == CATNIP_HEAP_PAGE_MAGIC);

      catnip_obj_head *currentObj = CATNIP_RUNTIME_GC_PAGE_START(currentPage);

      // Loop through each object in the current page
      while (((void*) currentObj) < currentPage->current) {
        CATNIP_ASSERT(currentObj->magic == CATNIP_OBJ_HEAD_MAGIC);
        CATNIP_ASSERT(currentObj->move_ptr == currentObj);

        const catnip_ui32_t currentObjLen = currentObj->bytelen;
        const catnip_ui32_t currentObjAlignedLen = CATNIP_ALIGN8(currentObj->bytelen);
        const catnip_bool_t keep = currentObj->refcount != 0 || currentObj->extern_refcount != 0;

        if (keep) {
          // We need to find this page a new compacted spot.

          catnip_obj_head *nextRelocationPtr = ((void *) relocationPtr) + currentObjAlignedLen;

          if (((void*) nextRelocationPtr) > relocationPage->end) {
            // This object doesn't fit in the current reloaction page, we need to move onto the next one.

            relocationPage->next_current = relocationPtr;

            ++relocationPageIdx;
            relocationPage = CATNIP_LIST_GET(&runtime->gc_pages, catnip_gc_page*, relocationPageIdx);
            relocationPtr = CATNIP_RUNTIME_GC_PAGE_START(relocationPage);
            nextRelocationPtr = ((void *) relocationPtr) + currentObjAlignedLen;

            // Sanity check, the object should fit in the page.
            CATNIP_ASSERT(((void*) nextRelocationPtr) <= relocationPage->end);
          }

          #ifdef CATNIP_GC_STATS
          ++runtime->gc_stats->num_sml_objs;
          if (currentObj != relocationPtr) ++runtime->gc_stats->latest_moved_sml_obj_count;
          runtime->gc_stats->total_used_page_memory += currentObjLen;
          #endif

          // Mark it to be moved to the next spot 
          currentObj->move_ptr = relocationPtr;

          relocationPtr = nextRelocationPtr;
        } else {

          // We set the move spot to null to indicate the object is going to be deleted.
          currentObj->move_ptr = CATNIP_NULL;
          #ifdef CATNIP_GC_STATS
          ++runtime->gc_stats->latest_freed_sml_obj_count;
          #endif
        }

        // Move onto the next object
        currentObj = ((void *) currentObj) + currentObjAlignedLen;
      }

      relocationPage->next_current = relocationPtr;

      // We have now figured out where each object is going to be moved to.
      // We mark pages which have no objects being moved into them to be deleted.
      // Yay freeing memory, but walloc doesn't ever actually free WASM memory, oh well :c

      for (catnip_ui32_t currentPageIdx = relocationPageIdx + 1; currentPageIdx < numberOfPages; currentPageIdx++) {
        catnip_gc_page *currentPage = CATNIP_LIST_GET(&runtime->gc_pages, catnip_gc_page*, currentPageIdx);

        // Mark it for deletion by setting its next current to null
        currentPage->next_current = CATNIP_NULL;
      }
    }

    // Now we know were everything is going, move all those pointers out there in the wild
    gc_iterate_roots(runtime, &gc_move_root);
  }

  // Next, actually do the moving
  for (catnip_ui32_t currentPageIdx = 0; currentPageIdx < numberOfPages; currentPageIdx++) {
    catnip_gc_page *currentPage = CATNIP_LIST_GET(&runtime->gc_pages, catnip_gc_page*, currentPageIdx);

    CATNIP_ASSERT(currentPage->magic == CATNIP_HEAP_PAGE_MAGIC);

    catnip_obj_head *currentObj = CATNIP_RUNTIME_GC_PAGE_START(currentPage);

    // Loop through each object in the current page
    while (((void*) currentObj) < currentPage->current) {

      CATNIP_ASSERT(currentObj->magic == CATNIP_OBJ_HEAD_MAGIC);

      const catnip_ui32_t currentObjLen = currentObj->bytelen;
      const catnip_ui32_t currentObjAlignedLen = CATNIP_ALIGN8(currentObj->bytelen);

      // Reset the refcount for next time
      currentObj->refcount = 0;

      if (currentObj->move_ptr != 0 && currentObj->move_ptr != currentObj) {
        // Move that shit!
        catnip_mem_move(currentObj->move_ptr, currentObj, currentObjLen);
      }

      // Object has now been moved, don't do anything with the old pointers anymore

      // Move onto the next object
      currentObj = ((void *) currentObj) + currentObjAlignedLen;
    }

    currentPage->current = currentPage->next_current;
  }

  // Loop through backwards so we can delete pages as we go
  for (catnip_i32_t currentPageIdx = numberOfPages - 1; currentPageIdx >= 0; currentPageIdx--) {
    catnip_gc_page *currentPage = CATNIP_LIST_GET(&runtime->gc_pages, catnip_gc_page*, currentPageIdx);

    CATNIP_ASSERT(currentPage->magic == CATNIP_HEAP_PAGE_MAGIC);

    if (currentPage->next_current != CATNIP_NULL) break;

    CATNIP_LIST_REMOVE(&runtime->gc_pages, catnip_gc_page *, currentPageIdx);
    catnip_mem_free(currentPage);

    #ifdef CATNIP_GC_STATS
    ++runtime->gc_stats->latest_freed_pages;
    #endif
  }

  // Finally, check to see if any of the large objects freed
  // Loop through backwards so we can free as we go
  for (catnip_i32_t currentObjIdx = CATNIP_LIST_LENGTH(&runtime->gc_large_objs, catnip_obj_head *) - 1; currentObjIdx >= 0; currentObjIdx--) {
      catnip_obj_head *currentObj = CATNIP_LIST_GET(&runtime->gc_large_objs, catnip_obj_head *, currentObjIdx);
      CATNIP_ASSERT(currentObj->magic == CATNIP_OBJ_HEAD_MAGIC);
      CATNIP_ASSERT(currentObj->move_ptr == currentObj);

      const catnip_bool_t keep = currentObj->refcount != 0 || currentObj->extern_refcount != 0;

      if (keep) {
        currentObj->refcount = 0;
        #ifdef CATNIP_GC_STATS
        ++runtime->gc_stats->num_lrg_objs;
        runtime->gc_stats->total_memory += currentObj->bytelen;
        #endif
      } else {
        CATNIP_LIST_REMOVE(&runtime->gc_large_objs, catnip_obj_head *, currentObjIdx);
        catnip_mem_free(currentObj);
        #ifdef CATNIP_GC_STATS
        ++runtime->gc_stats->latest_freed_lrg_obj_count;
        #endif
      }
  }

  // Set the page to the new spot we should start allocating stuff :))
  runtime->gc_page = relocationPage;
  runtime->gc_page_index = relocationPageIdx;

  #ifdef CATNIP_GC_STATS
  runtime->gc_stats->num_pages = CATNIP_LIST_LENGTH(&runtime->gc_pages, catnip_gc_page *);
  runtime->gc_stats->total_page_memory = runtime->gc_stats->num_pages * CATNIP_HEAP_PAGE_SIZE_BYTES;
  runtime->gc_stats->total_memory += runtime->gc_stats->total_page_memory;
  #endif
  #endif // ifndef CATNIP_GC_DISABLE
}
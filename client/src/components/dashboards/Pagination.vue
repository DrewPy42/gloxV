<template>
  <nav>
    <ul class="pagination">
      <li class="page-item blue">
        <span class="page-link pagination-item clickable" :class="{ disabled: isInFirstPage }">
          <font-awesome-icon :icon="['fas', 'angles-left']" @click="onClickFirstPage" />
        </span>
      </li>
      <li class="page-item blue">
        <span class="page-link pagination-item clickable" :class="{ disabled: isInFirstPage }">
          <font-awesome-icon :icon="['fas', 'angle-left']" @click="onClickPreviousPage" />
        </span>
      </li>
      <li v-for="page in pages" :key="page">
        <div v-if="page === null" class="ellipsis blue">
          <span class="page-link pagination-item disabled">
            <font-awesome-icon :icon="['fas', 'ellipsis']" />
          </span>
        </div>
        <input
          v-else
          type="button"
          @click="onClickPage(page)"
          :aria-label="`Go to page ${page}`"
          :class="{ active: isPageActive(page) }"
          class="page-item pagination-item page-link"
          :value="page"
        />
      </li>

      <li class="page-item blue">
        <span class="page-link pagination-item clickable" :class="{ disabled: isInLastPage }">
          <font-awesome-icon :icon="['fas', 'angle-right']" @click="onClickNextPage" />
        </span>
      </li>
      <li class="page-item blue">
        <span class="page-link pagination-item clickable" :class="{ disabled: isInLastPage }">
          <font-awesome-icon :icon="['fas', 'angles-right']" @click="onClickLastPage" />
        </span>
      </li>
    </ul>
  </nav>
</template>

<script>
import { computed } from 'vue'

export default {
  name: 'Pagination',
  components: {},
  props: {
    totalPages: Number,
    currentPage: Number
  },
  emits: ['pageChanged'],

  setup(props, { emit }) {
    const pages = computed(() => {
      let range = []
      const rangeSize = 1
      const minPaginationElems = 5 + rangeSize * 2
      let rangeStart = props.totalPages <= minPaginationElems ? 1 : props.currentPage - rangeSize
      let rangeEnd =
        props.totalPages <= minPaginationElems ? props.totalPages : props.currentPage + rangeSize
      rangeEnd = rangeEnd > props.totalPages ? props.totalPages : rangeEnd
      rangeStart = rangeStart < 1 ? 1 : rangeStart

      if (props.totalPages > minPaginationElems) {
        const isStartBoundaryReached = rangeStart - 1 < 3
        const isEndBoundaryReached = props.totalPages - rangeEnd < 3
        if (isStartBoundaryReached) {
          rangeEnd = minPaginationElems - 2
          for (let i = 1; i < rangeStart; i++) {
            range.push(i)
          }
        } else {
          range.push(1)
          range.push(null)
        }
        if (isEndBoundaryReached) {
          rangeStart = props.totalPages - (minPaginationElems - 3)
          for (let i = rangeStart; i <= props.totalPages; i++) {
            range.push(i)
          }
        } else {
          for (let i = rangeStart; i <= rangeEnd; i++) {
            range.push(i)
          }
          range.push(null)
          range.push(props.totalPages)
        }
      } else {
        for (let i = rangeStart; i <= rangeEnd; i++) {
          range.push(i)
        }
      }
      if (range.length === 0) {
        range.push(1)
      }
      return range
    })

    const isInFirstPage = computed(() => {
      return props.currentPage === 1
    })
    const isInLastPage = computed(() => {
      return props.currentPage === props.totalPages
    })
    const isPageActive = (page) => {
      return props.currentPage === page
    }

    function onClickFirstPage() {
      emit('pageChanged', 1)
    }

    function onClickPreviousPage() {
      if (props.currentPage !== 1) {
        emit('pageChanged', props.currentPage - 1)
      }
    }

    function onClickPage(page) {
      emit('pageChanged', page)
    }

    function onClickNextPage() {
      if (props.currentPage !== props.totalPages) {
        emit('pageChanged', props.currentPage + 1)
      }
    }

    function onClickLastPage() {
      emit('pageChanged', props.totalPages)
    }

    return {
      pages,
      isInFirstPage,
      isInLastPage,
      onClickFirstPage,
      onClickPreviousPage,
      onClickPage,
      onClickNextPage,
      onClickLastPage,
      isPageActive
    }
  }
}
</script>

<style scoped lang="scss">
  @use '@/styles/pagination';
</style>

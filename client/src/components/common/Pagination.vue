<template>
  <nav class="pagination-wrapper" v-if="totalPages > 1">
    <ul class="pagination">
      <!-- First page -->
      <li class="page-item" :class="{ disabled: currentPage === 1 }">
        <a 
          class="page-link" 
          href="#" 
          @click.prevent="goToPage(1)"
          aria-label="First"
        >
          <font-awesome-icon :icon="['fas', 'angles-left']" />
        </a>
      </li>

      <!-- Previous page -->
      <li class="page-item" :class="{ disabled: currentPage === 1 }">
        <a 
          class="page-link" 
          href="#" 
          @click.prevent="goToPage(currentPage - 1)"
          aria-label="Previous"
        >
          <font-awesome-icon :icon="['fas', 'angle-left']" />
        </a>
      </li>

      <!-- Page numbers -->
      <li 
        v-for="page in visiblePages" 
        :key="page"
        class="page-item"
        :class="{ 
          active: page === currentPage,
          ellipsis: page === '...'
        }"
      >
        <span v-if="page === '...'" class="page-link">...</span>
        <a 
          v-else
          class="page-link" 
          href="#" 
          @click.prevent="goToPage(page as number)"
        >
          {{ page }}
        </a>
      </li>

      <!-- Next page -->
      <li class="page-item" :class="{ disabled: currentPage === totalPages }">
        <a 
          class="page-link" 
          href="#" 
          @click.prevent="goToPage(currentPage + 1)"
          aria-label="Next"
        >
          <font-awesome-icon :icon="['fas', 'angle-right']" />
        </a>
      </li>

      <!-- Last page -->
      <li class="page-item" :class="{ disabled: currentPage === totalPages }">
        <a 
          class="page-link" 
          href="#" 
          @click.prevent="goToPage(totalPages)"
          aria-label="Last"
        >
          <font-awesome-icon :icon="['fas', 'angles-right']" />
        </a>
      </li>
    </ul>

    <!-- Page jump (optional) -->
    <div class="page-jump" v-if="showPageJump && totalPages > maxVisiblePages">
      <span>Go to:</span>
      <input 
        type="number" 
        :min="1" 
        :max="totalPages"
        :value="currentPage"
        @keyup.enter="handlePageJump($event)"
        @blur="handlePageJump($event)"
        class="form-control form-control-sm"
      />
    </div>
  </nav>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'

// ============================================================================
// Props & Emits
// ============================================================================

interface Props {
  currentPage: number
  totalPages: number
  maxVisiblePages?: number
  showPageJump?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  maxVisiblePages: 7,
  showPageJump: false
})

const emit = defineEmits<{
  (e: 'page-changed', page: number): void
}>()

// ============================================================================
// Computed
// ============================================================================

const visiblePages = computed(() => {
  const pages: (number | string)[] = []
  const total = props.totalPages
  const current = props.currentPage
  const max = props.maxVisiblePages

  if (total <= max) {
    // Show all pages if total is less than max
    for (let i = 1; i <= total; i++) {
      pages.push(i)
    }
  } else {
    // Always show first page
    pages.push(1)

    // Calculate start and end of visible range
    let start = Math.max(2, current - Math.floor((max - 4) / 2))
    let end = Math.min(total - 1, start + max - 4)

    // Adjust if we're near the end
    if (end === total - 1) {
      start = Math.max(2, end - (max - 4))
    }

    // Add ellipsis after first page if needed
    if (start > 2) {
      pages.push('...')
    }

    // Add middle pages
    for (let i = start; i <= end; i++) {
      pages.push(i)
    }

    // Add ellipsis before last page if needed
    if (end < total - 1) {
      pages.push('...')
    }

    // Always show last page
    pages.push(total)
  }

  return pages
})

// ============================================================================
// Methods
// ============================================================================

const goToPage = (page: number) => {
  if (page >= 1 && page <= props.totalPages && page !== props.currentPage) {
    emit('page-changed', page)
  }
}

const handlePageJump = (event: Event) => {
  const input = event.target as HTMLInputElement
  const page = parseInt(input.value)
  if (!isNaN(page)) {
    goToPage(page)
  }
}
</script>

<style scoped lang="scss">
.pagination-wrapper {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.pagination {
  margin: 0;
  display: flex;
  list-style: none;
  padding: 0;
  gap: 0.25rem;

  .page-item {
    &.disabled {
      .page-link {
        color: #ccc;
        pointer-events: none;
        cursor: not-allowed;
      }
    }

    &.active {
      .page-link {
        background-color: #0d6efd;
        border-color: #0d6efd;
        color: white;
      }
    }

    &.ellipsis {
      .page-link {
        border: none;
        background: none;
        cursor: default;
      }
    }
  }

  .page-link {
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 36px;
    height: 36px;
    padding: 0.375rem 0.75rem;
    border: 1px solid #dee2e6;
    border-radius: 0.25rem;
    background-color: white;
    color: #0d6efd;
    text-decoration: none;
    cursor: pointer;
    transition: all 0.15s ease-in-out;

    &:hover:not(:disabled) {
      background-color: #e9ecef;
      border-color: #dee2e6;
    }
  }
}

.page-jump {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;

  span {
    color: #666;
  }

  input {
    width: 60px;
    text-align: center;
  }
}
</style>

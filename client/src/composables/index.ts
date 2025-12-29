import { ref, computed, type Ref } from 'vue'

// ============================================================================
// Formatting composable
// ============================================================================

export function useFormatting() {
  const formatCurrency = (value: number | string | null | undefined): string => {
    if (value === null || value === undefined) return '$0.00'
    const numValue = typeof value === 'string' ? parseFloat(value) : value
    if (isNaN(numValue)) return '$0.00'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(numValue)
  }

  const formatPercentage = (value: number | string | null | undefined): string => {
    if (value === null || value === undefined) return '0%'
    const numValue = typeof value === 'string' ? parseFloat(value) : value
    if (isNaN(numValue)) return '0%'
    return new Intl.NumberFormat('en-US', {
      style: 'percent',
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    }).format(numValue)
  }

  const formatDate = (value: string | Date | null | undefined): string => {
    if (!value) return ''
    const date = typeof value === 'string' ? new Date(value) : value
    if (isNaN(date.getTime())) return ''
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date)
  }

  const formatDateShort = (value: string | Date | null | undefined): string => {
    if (!value) return ''
    const date = typeof value === 'string' ? new Date(value) : value
    if (isNaN(date.getTime())) return ''
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short'
    }).format(date)
  }

  const formatNumber = (value: number | string | null | undefined): string => {
    if (value === null || value === undefined) return '0'
    const numValue = typeof value === 'string' ? parseFloat(value) : value
    if (isNaN(numValue)) return '0'
    return new Intl.NumberFormat('en-US').format(numValue)
  }

  return {
    formatCurrency,
    formatPercentage,
    formatDate,
    formatDateShort,
    formatNumber
  }
}

// ============================================================================
// Modal composable
// ============================================================================

export function useModal() {
  const isOpen = ref(false)
  const modalData = ref<any>(null)

  const open = (data?: any) => {
    modalData.value = data ?? null
    isOpen.value = true
  }

  const close = () => {
    isOpen.value = false
    modalData.value = null
  }

  const toggle = () => {
    isOpen.value = !isOpen.value
  }

  return {
    isOpen,
    modalData,
    open,
    close,
    toggle
  }
}

// ============================================================================
// Pagination composable
// ============================================================================

export function usePagination(initialPage = 1, initialPerPage = 25) {
  const currentPage = ref(initialPage)
  const perPage = ref(initialPerPage)
  const totalRecords = ref(0)

  const totalPages = computed(() => Math.ceil(totalRecords.value / perPage.value))
  const isFirstPage = computed(() => currentPage.value === 1)
  const isLastPage = computed(() => currentPage.value === totalPages.value)
  const offset = computed(() => (currentPage.value - 1) * perPage.value)

  const setPage = (page: number) => {
    if (page >= 1 && page <= totalPages.value) {
      currentPage.value = page
    }
  }

  const nextPage = () => {
    if (!isLastPage.value) {
      currentPage.value++
    }
  }

  const prevPage = () => {
    if (!isFirstPage.value) {
      currentPage.value--
    }
  }

  const setPerPage = (count: number) => {
    perPage.value = count
    currentPage.value = 1
  }

  const setTotal = (total: number) => {
    totalRecords.value = total
  }

  return {
    currentPage,
    perPage,
    totalRecords,
    totalPages,
    isFirstPage,
    isLastPage,
    offset,
    setPage,
    nextPage,
    prevPage,
    setPerPage,
    setTotal
  }
}

// ============================================================================
// Search/Filter composable
// ============================================================================

export function useSearch(debounceMs = 300) {
  const searchQuery = ref('')
  const isSearching = ref(false)
  let debounceTimer: ReturnType<typeof setTimeout> | null = null

  const setSearch = (query: string, callback?: (query: string) => void) => {
    searchQuery.value = query
    
    if (debounceTimer) {
      clearTimeout(debounceTimer)
    }

    if (callback) {
      isSearching.value = true
      debounceTimer = setTimeout(() => {
        callback(query)
        isSearching.value = false
      }, debounceMs)
    }
  }

  const clearSearch = (callback?: () => void) => {
    searchQuery.value = ''
    if (callback) callback()
  }

  return {
    searchQuery,
    isSearching,
    setSearch,
    clearSearch
  }
}

// ============================================================================
// Sort composable
// ============================================================================

export function useSort(initialField = '', initialDirection: 'asc' | 'desc' = 'asc') {
  const sortField = ref(initialField)
  const sortDirection = ref<'asc' | 'desc'>(initialDirection)

  const setSort = (field: string) => {
    if (sortField.value === field) {
      // Toggle direction if same field
      sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
    } else {
      sortField.value = field
      sortDirection.value = 'asc'
    }
  }

  const getSortIcon = (field: string) => {
    if (sortField.value !== field) return 'sort'
    return sortDirection.value === 'asc' ? 'sort-up' : 'sort-down'
  }

  return {
    sortField,
    sortDirection,
    setSort,
    getSortIcon
  }
}

// ============================================================================
// Selection composable (for multi-select in tables)
// ============================================================================

export function useSelection<T extends { [key: string]: any }>(idField: string = 'id') {
  const selectedIds = ref<Set<number | string>>(new Set())
  const allSelected = ref(false)

  const isSelected = (item: T) => {
    return selectedIds.value.has(item[idField])
  }

  const toggleSelection = (item: T) => {
    const id = item[idField]
    if (selectedIds.value.has(id)) {
      selectedIds.value.delete(id)
    } else {
      selectedIds.value.add(id)
    }
    selectedIds.value = new Set(selectedIds.value) // Trigger reactivity
  }

  const selectAll = (items: T[]) => {
    items.forEach(item => selectedIds.value.add(item[idField]))
    selectedIds.value = new Set(selectedIds.value)
    allSelected.value = true
  }

  const deselectAll = () => {
    selectedIds.value.clear()
    selectedIds.value = new Set(selectedIds.value)
    allSelected.value = false
  }

  const toggleSelectAll = (items: T[]) => {
    if (allSelected.value) {
      deselectAll()
    } else {
      selectAll(items)
    }
  }

  const selectedCount = computed(() => selectedIds.value.size)

  return {
    selectedIds,
    allSelected,
    isSelected,
    toggleSelection,
    selectAll,
    deselectAll,
    toggleSelectAll,
    selectedCount
  }
}

// ============================================================================
// Image handling composable
// ============================================================================

export function useImage() {
  const checkImageExists = async (url: string): Promise<boolean> => {
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => resolve(true)
      img.onerror = () => resolve(false)
      img.src = url
    })
  }

  const getImageUrl = (path: string | null | undefined, fallback: string = ''): string => {
    if (!path) return fallback
    // Handle both absolute URLs and relative paths
    if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('/')) {
      return path
    }
    return `/${path}`
  }

  const getCoverImageUrl = (path: string | null | undefined): string => {
    return getImageUrl(path, '/images/covers/missing_cover.svg')
  }

  const getLogoImageUrl = (path: string | null | undefined): string => {
    return getImageUrl(path ? `/images/logos/${path}` : null, '')
  }

  return {
    checkImageExists,
    getImageUrl,
    getCoverImageUrl,
    getLogoImageUrl
  }
}

// ============================================================================
// Confirmation composable
// ============================================================================

export function useConfirmation() {
  const isConfirmOpen = ref(false)
  const confirmMessage = ref('')
  const confirmTitle = ref('Confirm')
  let resolvePromise: ((value: boolean) => void) | null = null

  const confirm = (message: string, title = 'Confirm'): Promise<boolean> => {
    confirmMessage.value = message
    confirmTitle.value = title
    isConfirmOpen.value = true

    return new Promise((resolve) => {
      resolvePromise = resolve
    })
  }

  const handleConfirm = () => {
    isConfirmOpen.value = false
    if (resolvePromise) {
      resolvePromise(true)
      resolvePromise = null
    }
  }

  const handleCancel = () => {
    isConfirmOpen.value = false
    if (resolvePromise) {
      resolvePromise(false)
      resolvePromise = null
    }
  }

  return {
    isConfirmOpen,
    confirmMessage,
    confirmTitle,
    confirm,
    handleConfirm,
    handleCancel
  }
}

// ============================================================================
// Toast/Notification composable
// ============================================================================

export interface ToastMessage {
  id: number
  type: 'success' | 'error' | 'warning' | 'info'
  message: string
  duration?: number
}

export function useToast() {
  const toasts = ref<ToastMessage[]>([])
  let nextId = 1

  const addToast = (type: ToastMessage['type'], message: string, duration = 5000) => {
    const id = nextId++
    const toast: ToastMessage = { id, type, message, duration }
    toasts.value.push(toast)

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id)
      }, duration)
    }

    return id
  }

  const removeToast = (id: number) => {
    const index = toasts.value.findIndex(t => t.id === id)
    if (index !== -1) {
      toasts.value.splice(index, 1)
    }
  }

  const success = (message: string, duration?: number) => addToast('success', message, duration)
  const error = (message: string, duration?: number) => addToast('error', message, duration)
  const warning = (message: string, duration?: number) => addToast('warning', message, duration)
  const info = (message: string, duration?: number) => addToast('info', message, duration)

  return {
    toasts,
    addToast,
    removeToast,
    success,
    error,
    warning,
    info
  }
}

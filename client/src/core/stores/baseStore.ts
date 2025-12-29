import { ref, computed, type Ref, type ComputedRef } from 'vue'
import { defineStore } from 'pinia'
import { fetchWrapper, type ApiResponse } from '../functions/fetchWrapper'

// ============================================================================
// Types
// ============================================================================

export interface StoreState<T> {
  records: Ref<T[]>
  currentRecord: Ref<T | null>
  loading: Ref<boolean>
  error: Ref<string | null>
  message: Ref<string>
  totalRecords: Ref<number>
  totalPages: Ref<number>
  currentPage: Ref<number>
  perPage: Ref<number>
  searchQuery: Ref<string>
  sortField: Ref<string>
  sortDirection: Ref<'asc' | 'desc'>
  filters: Ref<Record<string, any>>
}

export interface StoreActions<T> {
  fetchRecords: (options?: FetchOptions) => Promise<void>
  fetchRecord: (id: number) => Promise<T | null>
  createRecord: (data: Partial<T>) => Promise<T | null>
  updateRecord: (id: number, data: Partial<T>) => Promise<boolean>
  deleteRecord: (id: number) => Promise<boolean>
  setPage: (page: number) => Promise<void>
  setPerPage: (perPage: number) => Promise<void>
  setSearch: (query: string) => Promise<void>
  setSort: (field: string, direction?: 'asc' | 'desc') => Promise<void>
  setFilter: (key: string, value: any) => Promise<void>
  clearFilters: () => Promise<void>
  refresh: () => Promise<void>
  reset: () => void
}

export interface FetchOptions {
  page?: number
  limit?: number
  search?: string
  sortField?: string
  sortDirection?: 'asc' | 'desc'
  filters?: Record<string, any>
}

export interface StoreConfig {
  baseUrl: string
  entityName: string
  idField: string
}

// ============================================================================
// Factory function to create a generic store
// ============================================================================

export function createBaseStore<T extends Record<string, any>>(
  storeId: string,
  config: StoreConfig
) {
  return defineStore(storeId, () => {
    // State
    const records = ref<T[]>([]) as Ref<T[]>
    const currentRecord = ref<T | null>(null) as Ref<T | null>
    const loading = ref(false)
    const error = ref<string | null>(null)
    const message = ref('')
    const totalRecords = ref(0)
    const totalPages = ref(0)
    const currentPage = ref(1)
    const perPage = ref(25)
    const searchQuery = ref('')
    const sortField = ref('')
    const sortDirection = ref<'asc' | 'desc'>('asc')
    const filters = ref<Record<string, any>>({})

    // Computed
    const hasRecords = computed(() => records.value.length > 0)
    const isFirstPage = computed(() => currentPage.value === 1)
    const isLastPage = computed(() => currentPage.value === totalPages.value)

    // Build query string from current state
    const buildQueryString = (options?: FetchOptions): string => {
      const params = new URLSearchParams()
      
      const page = options?.page ?? currentPage.value
      const limit = options?.limit ?? perPage.value
      const search = options?.search ?? searchQuery.value
      const sort = options?.sortField ?? sortField.value
      const dir = options?.sortDirection ?? sortDirection.value
      const filterValues = options?.filters ?? filters.value

      params.set('page', page.toString())
      params.set('limit', limit.toString())
      
      if (search) {
        params.set('search', search)
      }
      
      if (sort) {
        params.set('sort', sort)
        params.set('direction', dir)
      }

      // Add any custom filters
      Object.entries(filterValues).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          params.set(key, value.toString())
        }
      })

      return params.toString()
    }

    // Actions
    const fetchRecords = async (options?: FetchOptions): Promise<void> => {
      loading.value = true
      error.value = null
      message.value = `Loading ${config.entityName}...`

      try {
        const queryString = buildQueryString(options)
        const url = `${config.baseUrl}?${queryString}`
        const data = await fetchWrapper.get<ApiResponse>(url)

        records.value = data.results || []
        totalRecords.value = data.count?.[0]?.total || 0
        
        const limit = options?.limit ?? perPage.value
        totalPages.value = Math.ceil(totalRecords.value / limit)
        currentPage.value = options?.page ?? currentPage.value
        
        if (options?.limit) perPage.value = options.limit
        if (options?.search !== undefined) searchQuery.value = options.search
        if (options?.sortField) sortField.value = options.sortField
        if (options?.sortDirection) sortDirection.value = options.sortDirection
        if (options?.filters) filters.value = options.filters

        message.value = `Found ${totalRecords.value} ${config.entityName}`
      } catch (err: any) {
        error.value = err.message || `Error loading ${config.entityName}`
        message.value = error.value
        console.error(`Error fetching ${config.entityName}:`, err)
      } finally {
        loading.value = false
      }
    }

    const fetchRecord = async (id: number): Promise<T | null> => {
      loading.value = true
      error.value = null
      message.value = `Loading ${config.entityName} record...`

      try {
        // Check cache first
        const cached = records.value.find(
          (r) => r[config.idField] === id
        )
        if (cached) {
          currentRecord.value = cached
          loading.value = false
          message.value = `${config.entityName} loaded from cache`
          return cached
        }

        // Fetch from API
        const url = `${config.baseUrl}?id=${id}`
        const data = await fetchWrapper.get<ApiResponse>(url)

        if (data.results && data.results.length > 0) {
          const record = data.results[0] as T
          currentRecord.value = record
          message.value = `${config.entityName} loaded`
          return record
        } else {
          message.value = `${config.entityName} not found`
          return null
        }
      } catch (err: any) {
        error.value = err.message || `Error loading ${config.entityName}`
        message.value = error.value
        console.error(`Error fetching ${config.entityName} record:`, err)
        return null
      } finally {
        loading.value = false
      }
    }

    const createRecord = async (data: Partial<T>): Promise<T | null> => {
      loading.value = true
      error.value = null
      message.value = `Creating ${config.entityName}...`

      try {
        const result = await fetchWrapper.post<{ [key: string]: number; message: string }>(
          config.baseUrl,
          data
        )
        message.value = result.message || `${config.entityName} created`
        
        // Refresh the list
        await fetchRecords()
        
        // Return the created record by fetching it
        const newId = result[config.idField]
        if (newId) {
          return await fetchRecord(newId)
        }
        return null
      } catch (err: any) {
        error.value = err.message || `Error creating ${config.entityName}`
        message.value = error.value
        console.error(`Error creating ${config.entityName}:`, err)
        return null
      } finally {
        loading.value = false
      }
    }

    const updateRecord = async (id: number, data: Partial<T>): Promise<boolean> => {
      loading.value = true
      error.value = null
      message.value = `Updating ${config.entityName}...`

      try {
        const result = await fetchWrapper.put<{ message: string }>(
          `${config.baseUrl}/${id}`,
          data
        )
        message.value = result.message || `${config.entityName} updated`
        
        // Update local cache
        const index = records.value.findIndex((r) => r[config.idField] === id)
        if (index !== -1) {
          records.value[index] = { ...records.value[index], ...data }
        }
        if (currentRecord.value && currentRecord.value[config.idField] === id) {
          currentRecord.value = { ...currentRecord.value, ...data }
        }
        
        return true
      } catch (err: any) {
        error.value = err.message || `Error updating ${config.entityName}`
        message.value = error.value
        console.error(`Error updating ${config.entityName}:`, err)
        return false
      } finally {
        loading.value = false
      }
    }

    const deleteRecord = async (id: number): Promise<boolean> => {
      loading.value = true
      error.value = null
      message.value = `Deleting ${config.entityName}...`

      try {
        const result = await fetchWrapper.delete<{ message: string }>(
          `${config.baseUrl}/${id}`
        )
        message.value = result.message || `${config.entityName} deleted`
        
        // Remove from local cache
        records.value = records.value.filter((r) => r[config.idField] !== id)
        if (currentRecord.value && currentRecord.value[config.idField] === id) {
          currentRecord.value = null
        }
        totalRecords.value--
        
        return true
      } catch (err: any) {
        error.value = err.message || `Error deleting ${config.entityName}`
        message.value = error.value
        console.error(`Error deleting ${config.entityName}:`, err)
        return false
      } finally {
        loading.value = false
      }
    }

    const setPage = async (page: number): Promise<void> => {
      if (page !== currentPage.value && page > 0 && page <= totalPages.value) {
        await fetchRecords({ page })
      }
    }

    const setPerPage = async (newPerPage: number): Promise<void> => {
      if (newPerPage !== perPage.value) {
        await fetchRecords({ page: 1, limit: newPerPage })
      }
    }

    const setSearch = async (query: string): Promise<void> => {
      searchQuery.value = query
      await fetchRecords({ page: 1, search: query })
    }

    const setSort = async (field: string, direction: 'asc' | 'desc' = 'asc'): Promise<void> => {
      sortField.value = field
      sortDirection.value = direction
      await fetchRecords({ sortField: field, sortDirection: direction })
    }

    const setFilter = async (key: string, value: any): Promise<void> => {
      filters.value[key] = value
      await fetchRecords({ page: 1 })
    }

    const clearFilters = async (): Promise<void> => {
      filters.value = {}
      searchQuery.value = ''
      await fetchRecords({ page: 1, search: '', filters: {} })
    }

    const refresh = async (): Promise<void> => {
      await fetchRecords()
    }

    const reset = (): void => {
      records.value = []
      currentRecord.value = null
      loading.value = false
      error.value = null
      message.value = ''
      totalRecords.value = 0
      totalPages.value = 0
      currentPage.value = 1
      perPage.value = 25
      searchQuery.value = ''
      sortField.value = ''
      sortDirection.value = 'asc'
      filters.value = {}
    }

    return {
      // State
      records,
      currentRecord,
      loading,
      error,
      message,
      totalRecords,
      totalPages,
      currentPage,
      perPage,
      searchQuery,
      sortField,
      sortDirection,
      filters,
      // Computed
      hasRecords,
      isFirstPage,
      isLastPage,
      // Actions
      fetchRecords,
      fetchRecord,
      createRecord,
      updateRecord,
      deleteRecord,
      setPage,
      setPerPage,
      setSearch,
      setSort,
      setFilter,
      clearFilters,
      refresh,
      reset
    }
  })
}

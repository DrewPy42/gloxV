import type { defaultStore } from './defaultStore'
import { fetchWrapper, type ApiResponse } from '../functions/fetchWrapper'

export interface DefaultActions {
  fetchRecords: (page?: number, limit?: number) => Promise<void>
  changePage: (page: number) => Promise<void>
  setSortOptions: (sortField: string, sortDirection?: string) => void
  setFilters: (filters: any[]) => void
  setPerPage: (perPage: number) => Promise<void>
  refreshData: () => Promise<void>
}

export function createDefaultActions(state: defaultStore): DefaultActions {
  const fetchRecords = async (page: number = 1, limit: number = 25) => {
    state.loading.value = true
    state.message.value = `Loading ${state.recordType.value} data...`
    
    try {
      const query = `?page=${page}&limit=${limit}`
      const url = `${state.baseURL.value}${query}`
      const data = await fetchWrapper.get<ApiResponse>(url)
      
      state.records.value = data.results || []
      state.totalRecords.value = data.count?.[0]?.total || 0
      state.totalPages.value = Math.ceil(state.totalRecords.value / limit)
      state.currentPage.value = page
      state.perPage.value = limit
      state.message.value = `Found ${state.totalRecords.value} total records`
      state.loading.value = false
    } catch (error) {
      state.loading.value = false
      state.message.value = `Error loading ${state.recordType.value} data`
      console.error(`Error fetching ${state.recordType.value}:`, error)
    }
  }

  const changePage = async (page: number) => {
    if (page !== state.currentPage.value && page > 0 && page <= state.totalPages.value) {
      await fetchRecords(page, state.perPage.value)
    }
  }

  const setSortOptions = (sortField: string, sortDirection: string = 'asc') => {
    state.currentSort.value = sortField
    state.currentSortDir.value = sortDirection
  }

  const setFilters = (filters: any[]) => {
    state.filters.value = filters
  }

  const setPerPage = async (perPage: number) => {
    if (perPage !== state.perPage.value) {
      await fetchRecords(1, perPage)
    }
  }

  const refreshData = async () => {
    await fetchRecords(state.currentPage.value, state.perPage.value)
  }

  return {
    fetchRecords,
    changePage,
    setSortOptions,
    setFilters,
    setPerPage,
    refreshData
  }
}

import { defineStore } from 'pinia'
import createState from './createState'
import { createDefaultActions } from './defaultActions'
import { VolumeStore } from './volumeStore.interface'
import { fetchWrapper, type ApiResponse } from '../functions/fetchWrapper'

export const useVolumeStore = defineStore('volume', () => {
  const state = createState() as VolumeStore

  state.storeName = 'volume'
  state.baseURL.value = 'http://localhost:3000/api/volume'
  state.recordType.value = 'volume'

  const actions = createDefaultActions(state)

  const fetchVolumes = actions.fetchRecords
  const fetchVolumeRecord = actions.fetchRecord

  // Custom method to fetch volumes by title_id
  const fetchVolumesByTitleId = async (titleId: number) => {
    state.loading.value = true
    state.message.value = 'Loading volumes...'
    
    try {
      const query = `?title_id=${titleId}`
      const url = `${state.baseURL.value}${query}`
      const data = await fetchWrapper.get<ApiResponse>(url)
      
      state.records.value = data.results || []
      state.totalRecords.value = data.results?.length || 0
      state.message.value = `Found ${state.totalRecords.value} volumes`
      state.loading.value = false
    } catch (error) {
      state.loading.value = false
      state.message.value = 'Error loading volumes'
      console.error('Error fetching volumes:', error)
    }
  }

  return {
    ...state,
    ...actions,
    fetchVolumes,
    fetchVolumeRecord,
    fetchVolumesByTitleId
  }
})
  
import { defineStore } from 'pinia'
import createState from './createState'
import type { PublisherStore } from './publisherStore.interface'
import { createDefaultActions } from './defaultActions'
import { fetchWrapper } from '../functions/fetchWrapper'

export const usePublisherStore = defineStore('publisher', () => {
  const state = createState() as PublisherStore

  state.storeName = 'publisher'
  state.baseURL.value = 'http://localhost:3000/api/publisher'
  state.recordType.value = 'publisher'

  const actions = createDefaultActions(state)

  const fetchPublishers = actions.fetchRecords
  
  // Override fetchPublishers to get all records for dropdown usage
  const fetchAllPublishers = async () => {
    state.loading.value = true
    state.message.value = 'Loading all publishers...'
    
    try {
      const query = '?getall=true'
      const url = `${state.baseURL.value}${query}`
      const data = await fetchWrapper.get(url)
      
      state.records.value = data.results || []
      state.totalRecords.value = data.results?.length || 0
      state.message.value = `Loaded ${state.totalRecords.value} publishers`
      state.loading.value = false
    } catch (error) {
      state.loading.value = false
      state.message.value = 'Error loading publishers'
      console.error('Error fetching all publishers:', error)
    }
  }

  return {
    ...state,
    ...actions,
    fetchPublishers,
    fetchAllPublishers
  }
})

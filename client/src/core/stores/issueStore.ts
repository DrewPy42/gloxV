import { defineStore } from 'pinia'
import createState from './createState'
import type { IssueStore } from './issueStore.interface'
import { createDefaultActions } from './defaultActions'
import { fetchWrapper } from '../functions/fetchWrapper'

export const useIssueStore = defineStore('issue', () => {
  const state = createState() as IssueStore
  
  state.storeName = 'issue'
  state.baseURL.value = 'http://localhost:3000/api/issues'
  state.recordType.value = 'issue'

  const actions = createDefaultActions(state)

  const fetchIssues = actions.fetchRecords
  const fetchIssueRecord = actions.fetchRecord
  
  // Custom method to fetch issues by volume ID with pagination support
  const fetchIssuesByVolumeId = async (volumeId: number, page = 1, limit = 25) => {
    state.loading.value = true
    state.message.value = `Loading issues for volume ${volumeId}...`
    
    try {
      const params = new URLSearchParams()
      params.append('volume_id', volumeId.toString())
      params.append('page', page.toString())
      params.append('limit', limit.toString())
      
      const url = `${state.baseURL.value}?${params.toString()}`
      const data = await fetchWrapper.get(url)
      
      state.records.value = data.results || []
      state.totalRecords.value = data.count?.[0]?.total || 0
      state.message.value = `Found ${state.totalRecords.value} issues`
      return data
    } catch (error) {
      state.message.value = 'Error loading issues'
      console.error('Error fetching issues by volume ID:', error)
      throw error
    } finally {
      state.loading.value = false
    }
}

  // Custom method to fetch issues by title ID
  const fetchIssuesByTitleId = async (titleId: number) => {
    state.loading.value = true
    state.message.value = `Loading issues for title ${titleId}...`
    
    try {
      const url = `${state.baseURL.value}?title_id=${titleId}`
      const data = await fetchWrapper.get(url)
      
      state.records.value = data.results || []
      state.totalRecords.value = data.count?.[0]?.total || 0
      state.message.value = `Found ${state.records.value.length} issues`
      state.loading.value = false
    } catch (error) {
      state.loading.value = false
      state.message.value = 'Error loading issues'
      console.error('Error fetching issues by title ID:', error)
    }
  }

  return {
    ...state,
    ...actions,
    fetchIssues,
    fetchIssueRecord,
    fetchIssuesByVolumeId,
    fetchIssuesByTitleId
  }
})

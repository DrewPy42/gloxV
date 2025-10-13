import { defineStore } from 'pinia'
import createState from './createState'
import type { SeriesStore } from './seriesStore.interface'
import { createDefaultActions } from './defaultActions'

export const useSeriesStore = defineStore('series', () => {
  const state = createState() as SeriesStore
  
  state.storeName = 'series'
  state.baseURL.value = 'http://localhost:3000/api/series'
  state.recordType.value = 'series'

  const actions = createDefaultActions(state)

  const fetchSeries = actions.fetchRecords

  return {
    ...state,
    ...actions,
    fetchSeries
  }
})

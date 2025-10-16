import { defineStore } from 'pinia'
import createState from './createState'
import { createDefaultActions } from './defaultActions'
import { VolumeStore } from './volumeStore.interface'

export const useVolumeStore = defineStore('volume', () => {
  const state = createState() as VolumeStore

  state.storeName = 'volume'
  state.baseURL.value = 'http://localhost:3000/api/volume'
  state.recordType.value = 'volume'

  const actions = createDefaultActions(state)

  const fetchVolumes = actions.fetchRecords
  const fetchVolumeRecord = actions.fetchRecord

  return {
    ...state,
    ...actions,
    fetchVolumes,
    fetchVolumeRecord
  }
})
  
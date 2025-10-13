import type { defaultStore } from './defaultStore'
import { ref } from 'vue'

export default function (): defaultStore {
  return {
    baseURL: ref(''),
    currentPage: ref(1),
    currentSort: ref(''),
    currentSortDir: ref(''),
    filters: ref([]),
    flags: ref([]),
    found: ref(<any[]>[]),
    loading: ref(false),
    message: ref(''),
    messageRecord: ref(''),
    perPage: ref(25),
    record: ref(<any[]>[]),
    recordType: ref(''),
    records: ref(<any[]>[]),
    storeName: '',
    totalPages: ref(0),
    totalRecords: ref(-1)
  }
}
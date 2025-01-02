import { Ref } from 'vue'

// import { FilterModel, FlagModel } from "../../models";

export interface defaultStore {
  baseURL: Ref<string | null>
  currentPage: Ref<number>
  currentSort: Ref<string>
  currentSortDir: Ref<string>
  filters: Ref<Array<any>>
  flags: Ref<Array<any>>
  found: Ref<Array<any>>
  loading: Ref<boolean>
  message: Ref<string>
  messageRecord: Ref<string>
  perPage: Ref<number>
  record: Ref<Array<any>>
  recordType: Ref<string>
  records: Ref<Array<any>>
  storeName: string
  totalPages: Ref<number>
  totalRecords: Ref<number>
}

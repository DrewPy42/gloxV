import { Ref } from 'vue'
import { SeriesModel } from '../models/series.model'
import { defaultStore } from './defaultStore'

export interface SeriesStore extends defaultStore {
  found: Ref<SeriesModel[]>
  record: Ref<SeriesModel[]>
  records: Ref<SeriesModel[]>
}

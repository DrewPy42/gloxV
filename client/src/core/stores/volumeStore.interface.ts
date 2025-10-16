import { Ref } from 'vue'
import { VolumeModel } from '../models/volume.model'
import { defaultStore } from './defaultStore'

export interface VolumeStore extends defaultStore {
  found: Ref<VolumeModel[]>
  record: Ref<VolumeModel[]>
  records: Ref<VolumeModel[]>
}
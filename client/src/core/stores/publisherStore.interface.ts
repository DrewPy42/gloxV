import { Ref } from 'vue'
import { PublisherModel } from '../models/publisher.model'
import { defaultStore } from './defaultStore'

export interface PublisherStore extends defaultStore {
  found: Ref<PublisherModel[]>
  record: Ref<PublisherModel[]>
  records: Ref<PublisherModel[]>
}
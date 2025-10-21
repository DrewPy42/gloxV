import { Ref } from 'vue'
import { IssueModel } from '../models/issue.model'
import { defaultStore } from './defaultStore'

export interface IssueStore extends defaultStore {
  found: Ref<IssueModel[]>
  record: Ref<IssueModel[]>
  records: Ref<IssueModel[]>
}

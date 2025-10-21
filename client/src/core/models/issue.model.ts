export interface IssueModel {
  issue_id: number
  title_id: number
  issue_number: string
  volume_number: number
  volume_id: number
  issue_date?: Date
  cover_info?: string
  issue_title?: string
  crossover_title?: string
  crossover_part?: string
  issue_notes?: string
  cover_art_file?: string
  copy_count: number
  issue_price: number
  issue_value: number
  created_date?: Date
  modified_date?: Date
}

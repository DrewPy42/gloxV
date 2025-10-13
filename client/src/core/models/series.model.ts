export interface SeriesModel {
  title_id: number
  title: string
  issn?: string
  sort_title?: string
  limited_series: number
  publisher_id?: number
  comic_age_id: number
  series_notes?: string
  previous_title_id?: number
  new_title_id?: number
  location?: string
  series_cover_price: number
  series_value: number
  series_value_change: number
  volume_count: number
  issue_count: number
  copy_count: number
  created_date?: Date
  modified_date?: Date
}

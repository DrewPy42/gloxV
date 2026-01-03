// ============================================================================
// Base types
// ============================================================================

export interface AuditFields {
  created_at?: string
  updated_at?: string
  deleted_at?: string | null
}

export interface PaginatedResponse<T> {
  results: T[]
  count: { total: number }[]
}

export interface ApiError {
  error: string
  message?: string
}

// ============================================================================
// Lookup tables
// ============================================================================

export interface ComicAge {
  comic_age_id: number
  comic_age: string
  start_year?: number
  end_year?: number
}

export interface ConditionCode {
  condition_id: number
  condition_code: string
  condition_text: string
  condition_points?: number
  sort_order?: number
}

export interface JobCategory {
  job_category_id: number
  category_name: string
}

export interface JobTitle {
  job_title_id: number
  job_title: string
  job_category_id?: number
  category_name?: string // joined
}

// ============================================================================
// Publisher
// ============================================================================

export interface Publisher extends AuditFields {
  publisher_id: number
  publisher_name: string
  logo_path?: string
  website?: string
  notes?: string
  // Computed fields from API
  series_count?: number
  issue_count?: number
  copy_count?: number
  total_value?: number
}

// ============================================================================
// Person (Creator)
// ============================================================================

export interface Person extends AuditFields {
  person_id: number
  first_name?: string
  last_name: string
  biography?: string
  // Computed
  credit_count?: number
}

export interface PersonAlias {
  person_alias_id: number
  person_id: number
  alias_name: string
  alias_type: 'pen_name' | 'maiden_name' | 'nickname' | 'alternate_spelling' | 'other'
  notes?: string
}

// ============================================================================
// Location
// ============================================================================

export type StorageType = 'cabinet' | 'display' | 'bookshelf' | 'digital'

export interface Location extends AuditFields {
  location_id: number
  storage_type: StorageType
  location_name?: string
  cabinet_number?: number
  drawer_number?: number
  divider?: string
  row_num?: number
  shelf_description?: string
  file_path?: string
  backup_path?: string
  notes?: string
  is_insured_separately: boolean
  // Computed
  series_count?: number
  copy_count?: number
  total_value?: number
}

// ============================================================================
// Series
// ============================================================================

export interface Series extends AuditFields {
  series_id: number
  title: string
  sort_title?: string
  issn?: string
  publisher_id?: number
  comic_age_id?: number
  is_limited_series: boolean
  limited_series_count?: number
  notes?: string
  default_location_id?: number
  // Joined fields
  publisher_name?: string
  logo_path?: string
  website?: string
  comic_age?: string
  location_name?: string
  divider?: string
  // Computed (from summary endpoint)
  volume_count?: number
  issue_count?: number
  copy_count?: number
  total_cost?: number
  total_value?: number
}

export interface SeriesLink {
  series_link_id: number
  from_series_id: number
  to_series_id: number
  link_type: 'continues_story' | 'spin_off' | 'related'
  notes?: string
  from_title?: string
  to_title?: string
}

// ============================================================================
// Volume
// ============================================================================

export interface Volume extends AuditFields {
  volume_id: number
  series_id: number
  volume_number: number
  start_issue?: number
  end_issue?: number
  start_date?: string
  end_date?: string
  notes?: string
  // Joined
  series_title?: string
  // Computed
  issue_count?: number
  copy_count?: number
  total_cost?: number
  total_value?: number
}

// ============================================================================
// Issue
// ============================================================================

export interface Issue extends AuditFields {
  issue_id: number
  series_id: number
  volume_id?: number
  issue_number: string
  issue_number_numeric?: number
  sort_order: number
  issue_title?: string
  title_variant?: string
  cover_date?: string
  release_date?: string
  cover_price?: number
  page_count?: number
  notes?: string
  // Joined
  series_title?: string
  volume_number?: number
  publisher_name?: string
}

// ============================================================================
// Cover
// ============================================================================

export type CoverType = 'standard' | 'variant' | 'incentive' | 'sketch' | 'virgin' | 'foil' | 'other'

export interface Cover extends AuditFields {
  cover_id: number
  issue_id: number
  cover_type: CoverType
  cover_description?: string
  cover_artist_person_id?: number
  cover_image_path?: string
  is_primary: boolean
  notes?: string
  // Joined
  artist_first_name?: string
  artist_last_name?: string
  series_title?: string
  issue_number?: string
}

// ============================================================================
// Copy
// ============================================================================

export type CopyFormat = 'floppy' | 'digital' | 'cgc_slab' | 'cbcs_slab' | 'other'

export interface Copy extends AuditFields {
  copy_id: number
  issue_id: number
  cover_id?: number
  condition_id?: number
  format: CopyFormat
  purchase_price?: number
  current_value?: number
  value_date?: string
  purchase_date?: string
  purchase_source?: string
  location_id?: number
  grade?: number
  certification_number?: string
  file_path?: string
  notes?: string
  // Joined
  condition_code?: string
  condition_text?: string
  cover_type?: string
  cover_description?: string
  cover_image_path?: string
  location_name?: string
  storage_type?: string
  divider?: string
  issue_number?: string
  issue_title?: string
  cover_date?: string
  series_title?: string
  series_id?: number
  volume_number?: number
}

// ============================================================================
// Collected Edition
// ============================================================================

export type CollectedEditionFormat = 'tpb' | 'hardcover' | 'omnibus' | 'absolute' | 'digital_bundle' | 'manga_tankobon' | 'other'

export interface CollectedEdition extends AuditFields {
  collected_edition_id: number
  title: string
  publisher_id?: number
  format: CollectedEditionFormat
  isbn?: string
  page_count?: number
  cover_price?: number
  release_date?: string
  cover_image_path?: string
  condition_id?: number
  purchase_price?: number
  current_value?: number
  value_date?: string
  purchase_date?: string
  purchase_source?: string
  location_id?: number
  file_path?: string
  backup_path?: string
  notes?: string
  // Joined
  publisher_name?: string
  condition_code?: string
  condition_text?: string
  location_name?: string
  storage_type?: string
  issue_count?: number
}

export interface CollectedEditionIssue {
  collected_edition_issue_id: number
  collected_edition_id: number
  issue_id: number
  sequence_order?: number
  page_start?: number
  page_end?: number
  notes?: string
  // Joined
  issue_number?: string
  issue_title?: string
  cover_date?: string
  series_title?: string
  series_id?: number
}

// ============================================================================
// Credits
// ============================================================================

export interface IssueCredit {
  issue_credit_id: number
  issue_id: number
  person_id: number
  job_title_id: number
  notes?: string
  // Joined
  first_name?: string
  last_name?: string
  job_title?: string
  job_category?: string
  issue_number?: string
  series_title?: string
  series_id?: number
}

// ============================================================================
// Storyline
// ============================================================================

export type StorylineType = 'crossover' | 'event' | 'arc' | 'other'

export interface Storyline extends AuditFields {
  storyline_id: number
  storyline_name: string
  storyline_type: StorylineType
  start_date?: string
  end_date?: string
  description?: string
  banner_image_path?: string
  // Computed
  issue_count?: number
}

export interface StorylineIssue {
  storyline_issue_id: number
  storyline_id: number
  issue_id: number
  part_number?: number
  part_label?: string
  reading_order?: number
  // Joined
  issue_number?: string
  issue_title?: string
  cover_date?: string
  series_id?: number
  series_title?: string
  owned?: number
}

// ============================================================================
// Tags
// ============================================================================

export interface Tag {
  tag_id: number
  tag_name: string
  tag_category?: string
  color?: string
  created_at?: string
  usage_count?: number
}

export type TaggableEntityType = 'series' | 'volume' | 'issue' | 'copy' | 'collected_edition' | 'person' | 'storyline'

export interface Taggable {
  taggable_id: number
  tag_id: number
  entity_type: TaggableEntityType
  entity_id: number
}

// ============================================================================
// Value History
// ============================================================================

export type ValueEntityType = 'copy' | 'collected_edition'

export interface ValueHistory {
  value_history_id: number
  entity_type: ValueEntityType
  entity_id: number
  value: number
  value_source?: string
  recorded_at: string
  notes?: string
}

// ============================================================================
// Stats
// ============================================================================

export interface CollectionStats {
  series_count: number
  volume_count: number
  issue_count: number
  copy_count: number
  collected_edition_count: number
  total_cost: number
  total_value: number
  value_change_percent: number
}

export interface PublisherStats {
  publisher_id: number
  publisher_name: string
  series_count: number
  issue_count: number
  copy_count: number
  total_value: number
}

export interface HighValueCopy {
  copy_id: number
  current_value: number
  format: string
  grade?: number
  condition_code?: string
  issue_number: string
  issue_title?: string
  series_title: string
}

export interface MenuOption {
  title: string
  link: string
  iconCode: string
  iconString: string
}


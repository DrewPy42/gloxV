// Database model types for the glox comic book collection schema

// ============================================================================
// Base types
// ============================================================================

export interface AuditFields {
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

// ============================================================================
// Lookup tables
// ============================================================================

export interface ComicAge {
  comic_age_id: number;
  comic_age: string;
  start_year: number | null;
  end_year: number | null;
}

export interface ConditionCode {
  condition_id: number;
  condition_code: string;
  condition_text: string;
  condition_points: number | null;
  sort_order: number | null;
}

export interface JobCategory {
  job_category_id: number;
  category_name: string;
}

export interface JobTitle {
  job_title_id: number;
  job_title: string;
  job_category_id: number | null;
}

// ============================================================================
// Core entities
// ============================================================================

export interface Publisher extends AuditFields {
  publisher_id: number;
  publisher_name: string;
  logo_path: string | null;
  website: string | null;
  notes: string | null;
}

export interface Person extends AuditFields {
  person_id: number;
  first_name: string | null;
  last_name: string;
  biography: string | null;
}

export interface PersonAlias {
  person_alias_id: number;
  person_id: number;
  alias_name: string;
  alias_type: 'pen_name' | 'maiden_name' | 'nickname' | 'alternate_spelling' | 'other';
  notes: string | null;
}

// ============================================================================
// Location
// ============================================================================

export type StorageType = 'cabinet' | 'display' | 'bookshelf' | 'digital';

export interface Location extends AuditFields {
  location_id: number;
  storage_type: StorageType;
  location_name: string | null;
  cabinet_number: number | null;
  drawer_number: number | null;
  divider: string | null;
  row_num: number | null;
  shelf_description: string | null;
  file_path: string | null;
  backup_path: string | null;
  notes: string | null;
  is_insured_separately: boolean;
}

// ============================================================================
// Series hierarchy
// ============================================================================

export interface Series extends AuditFields {
  series_id: number;
  title: string;
  sort_title: string | null;
  issn: string | null;
  publisher_id: number | null;
  comic_age_id: number | null;
  is_limited_series: boolean;
  limited_series_count: number | null;
  notes: string | null;
  default_location_id: number | null;
}

export interface SeriesLink {
  series_link_id: number;
  from_series_id: number;
  to_series_id: number;
  link_type: 'continues_story' | 'spin_off' | 'related';
  notes: string | null;
  created_at: Date;
}

export interface Volume extends AuditFields {
  volume_id: number;
  series_id: number;
  volume_number: number;
  start_issue: number | null;
  end_issue: number | null;
  start_date: Date | null;
  end_date: Date | null;
  notes: string | null;
}

export interface Issue extends AuditFields {
  issue_id: number;
  series_id: number;
  volume_id: number | null;
  issue_number: string;
  issue_number_numeric: number | null;
  sort_order: number;
  issue_title: string | null;
  title_variant: string | null;
  cover_date: Date | null;
  release_date: Date | null;
  cover_price: number | null;
  page_count: number | null;
  notes: string | null;
}

// ============================================================================
// Covers
// ============================================================================

export type CoverType = 'standard' | 'variant' | 'incentive' | 'sketch' | 'virgin' | 'foil' | 'other';

export interface Cover extends AuditFields {
  cover_id: number;
  issue_id: number;
  cover_type: CoverType;
  cover_description: string | null;
  cover_artist_person_id: number | null;
  cover_image_path: string | null;
  is_primary: boolean;
  notes: string | null;
}

// ============================================================================
// Copies
// ============================================================================

export type CopyFormat = 'floppy' | 'digital' | 'cgc_slab' | 'cbcs_slab' | 'other';

export interface Copy extends AuditFields {
  copy_id: number;
  issue_id: number;
  cover_id: number | null;
  condition_id: number | null;
  format: CopyFormat;
  purchase_price: number | null;
  current_value: number | null;
  value_date: Date | null;
  purchase_date: Date | null;
  purchase_source: string | null;
  location_id: number | null;
  grade: number | null;
  certification_number: string | null;
  file_path: string | null;
  notes: string | null;
}

// ============================================================================
// Collected Editions
// ============================================================================

export type CollectedEditionFormat = 'tpb' | 'hardcover' | 'omnibus' | 'absolute' | 'digital_bundle' | 'manga_tankobon' | 'other';

export interface CollectedEdition extends AuditFields {
  collected_edition_id: number;
  title: string;
  publisher_id: number | null;
  format: CollectedEditionFormat;
  isbn: string | null;
  page_count: number | null;
  cover_price: number | null;
  release_date: Date | null;
  cover_image_path: string | null;
  condition_id: number | null;
  purchase_price: number | null;
  current_value: number | null;
  value_date: Date | null;
  purchase_date: Date | null;
  purchase_source: string | null;
  location_id: number | null;
  file_path: string | null;
  backup_path: string | null;
  notes: string | null;
}

export interface CollectedEditionIssue {
  collected_edition_issue_id: number;
  collected_edition_id: number;
  issue_id: number;
  sequence_order: number | null;
  page_start: number | null;
  page_end: number | null;
  notes: string | null;
}

// ============================================================================
// Credits
// ============================================================================

export interface IssueCredit {
  issue_credit_id: number;
  issue_id: number;
  person_id: number;
  job_title_id: number;
  notes: string | null;
}

// ============================================================================
// Storylines
// ============================================================================

export type StorylineType = 'crossover' | 'event' | 'arc' | 'other';

export interface Storyline extends AuditFields {
  storyline_id: number;
  storyline_name: string;
  storyline_type: StorylineType;
  start_date: Date | null;
  end_date: Date | null;
  description: string | null;
  banner_image_path: string | null;
}

export interface StorylineIssue {
  storyline_issue_id: number;
  storyline_id: number;
  issue_id: number;
  part_number: number | null;
  part_label: string | null;
  reading_order: number | null;
}

// ============================================================================
// Tags
// ============================================================================

export interface Tag {
  tag_id: number;
  tag_name: string;
  tag_category: string | null;
  color: string | null;
  created_at: Date;
}

export type TaggableEntityType = 'series' | 'volume' | 'issue' | 'copy' | 'collected_edition' | 'person' | 'storyline';

export interface Taggable {
  taggable_id: number;
  tag_id: number;
  entity_type: TaggableEntityType;
  entity_id: number;
}

// ============================================================================
// Value History
// ============================================================================

export type ValueEntityType = 'copy' | 'collected_edition';

export interface ValueHistory {
  value_history_id: number;
  entity_type: ValueEntityType;
  entity_id: number;
  value: number;
  value_source: string | null;
  recorded_at: Date;
  notes: string | null;
}

// ============================================================================
// API Response types
// ============================================================================

export interface PaginatedResponse<T> {
  results: T[];
  count: { total: number }[];
}

export interface ApiError {
  error: string;
  message?: string;
}

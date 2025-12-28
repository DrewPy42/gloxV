-- Migration Phase 3: Series and Volumes
-- Source: goldilox
-- Target: glox
--
-- Migrates series_title → series and series_volume → volume
-- Links series to locations created in Phase 2

USE glox;

-- ============================================================================
-- SERIES
-- ============================================================================
-- Map columns:
--   title_id → series_id
--   title → title
--   sort_title → sort_title
--   issn → issn
--   publisher_id → publisher_id
--   comic_age_id → comic_age_id
--   limited_series → is_limited_series
--   series_notes → notes
--   location → default_location_id (via lookup)
--
-- Dropped fields (denormalized, will compute via views):
--   series_cover_price, series_value, series_value_change
--   volume_count, issue_count, copy_count
--
-- Dropped fields (handled differently now):
--   previous_title_id, new_title_id → use series_link table if needed

INSERT INTO glox.series (
  series_id,
  title,
  sort_title,
  issn,
  publisher_id,
  comic_age_id,
  is_limited_series,
  limited_series_count,
  notes,
  default_location_id,
  created_at,
  updated_at
)
SELECT 
  st.title_id as series_id,
  st.title,
  st.sort_title,
  st.issn,
  st.publisher_id,
  st.comic_age_id,
  st.limited_series as is_limited_series,
  NULL as limited_series_count,  -- Populate manually if known
  st.series_notes as notes,
  l.location_id as default_location_id,
  COALESCE(st.created_date, NOW()) as created_at,
  COALESCE(st.modified_date, NOW()) as updated_at
FROM goldilox.series_title st
LEFT JOIN glox.location l ON l.divider = TRIM(SUBSTRING_INDEX(st.location, '[', 1));

-- ============================================================================
-- SERIES LINKS (from previous_title_id / new_title_id)
-- ============================================================================
-- If you had title chains, migrate them to series_link
-- These become 'continues_story' links

INSERT INTO glox.series_link (from_series_id, to_series_id, link_type, notes, created_at)
SELECT 
  st.title_id as from_series_id,
  st.new_title_id as to_series_id,
  'continues_story' as link_type,
  'Migrated from previous/new title chain' as notes,
  NOW() as created_at
FROM goldilox.series_title st
WHERE st.new_title_id IS NOT NULL
  AND st.new_title_id != 0
  AND EXISTS (SELECT 1 FROM goldilox.series_title st2 WHERE st2.title_id = st.new_title_id);

-- ============================================================================
-- VOLUMES
-- ============================================================================
-- Map columns:
--   volume_id → volume_id
--   title_id → series_id
--   volume_number → volume_number
--   issue_range → parse into start_issue/end_issue if possible, otherwise notes
--   start_date → start_date
--   end_date → end_date
--   missing_issues → notes (append)
--   notes → notes

INSERT INTO glox.volume (
  volume_id,
  series_id,
  volume_number,
  start_issue,
  end_issue,
  start_date,
  end_date,
  notes,
  created_at,
  updated_at
)
SELECT 
  sv.volume_id,
  sv.title_id as series_id,
  sv.volume_number,
  -- Try to parse start_issue from issue_range (format might be "1-50" or "1-25, 27-50")
  CASE 
    WHEN sv.issue_range REGEXP '^[0-9]+-[0-9]+$' 
    THEN CAST(SUBSTRING_INDEX(sv.issue_range, '-', 1) AS UNSIGNED)
    WHEN sv.issue_range REGEXP '^[0-9]+'
    THEN CAST(REGEXP_SUBSTR(sv.issue_range, '^[0-9]+') AS UNSIGNED)
    ELSE NULL
  END as start_issue,
  -- Try to parse end_issue from issue_range
  CASE 
    WHEN sv.issue_range REGEXP '^[0-9]+-[0-9]+$' 
    THEN CAST(SUBSTRING_INDEX(sv.issue_range, '-', -1) AS UNSIGNED)
    ELSE NULL
  END as end_issue,
  sv.start_date,
  sv.end_date,
  -- Combine notes, issue_range (if complex), and missing_issues
  CONCAT_WS('\n',
    sv.notes,
    CASE 
      WHEN sv.issue_range IS NOT NULL AND NOT sv.issue_range REGEXP '^[0-9]+-[0-9]+$'
      THEN CONCAT('Issue range: ', sv.issue_range)
      ELSE NULL
    END,
    CASE 
      WHEN sv.missing_issues IS NOT NULL AND sv.missing_issues != ''
      THEN CONCAT('Missing issues: ', sv.missing_issues)
      ELSE NULL
    END
  ) as notes,
  NOW() as created_at,
  NOW() as updated_at
FROM goldilox.series_volume sv
WHERE EXISTS (SELECT 1 FROM glox.series s WHERE s.series_id = sv.title_id);

-- ============================================================================
-- VALIDATION QUERIES
-- ============================================================================

-- Series counts
SELECT 'series' as table_name,
       (SELECT COUNT(*) FROM goldilox.series_title) as source_count,
       (SELECT COUNT(*) FROM glox.series) as target_count;

-- Volume counts
SELECT 'volume' as table_name,
       (SELECT COUNT(*) FROM goldilox.series_volume) as source_count,
       (SELECT COUNT(*) FROM glox.volume) as target_count;

-- Series with locations assigned
SELECT 
  COUNT(*) as total_series,
  SUM(CASE WHEN default_location_id IS NOT NULL THEN 1 ELSE 0 END) as with_location,
  SUM(CASE WHEN default_location_id IS NULL THEN 1 ELSE 0 END) as without_location
FROM glox.series;

-- Series links created
SELECT COUNT(*) as series_links_created FROM glox.series_link;

-- Sample series with their locations
SELECT s.series_id, s.title, l.divider, l.storage_type
FROM glox.series s
LEFT JOIN glox.location l ON s.default_location_id = l.location_id
ORDER BY s.title
LIMIT 20;

-- Sample volumes with parsed issue ranges
SELECT v.volume_id, s.title, v.volume_number, v.start_issue, v.end_issue, v.notes
FROM glox.volume v
JOIN glox.series s ON v.series_id = s.series_id
ORDER BY s.title, v.volume_number
LIMIT 20;

-- Check for volumes that didn't parse cleanly (have notes about issue_range)
SELECT v.volume_id, s.title, v.volume_number, v.notes
FROM glox.volume v
JOIN glox.series s ON v.series_id = s.series_id
WHERE v.notes LIKE '%Issue range:%'
LIMIT 20;

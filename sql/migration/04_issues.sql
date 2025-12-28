-- Migration Phase 4: Issues
-- Source: goldilox
-- Target: glox
--
-- Migrates series_issue → issue
-- Calculates sort_order from issue_number
-- Skips crossover fields (rebuild via storylines later)

USE glox;

-- ============================================================================
-- ISSUES
-- ============================================================================
-- Map columns:
--   issue_id → issue_id
--   title_id → series_id
--   volume_id → volume_id
--   issue_number → issue_number (now VARCHAR), issue_number_numeric, sort_order
--   issue_title → issue_title
--   issue_date → cover_date
--   issue_price → cover_price
--   cover_art_file → (moved to cover table, but we'll store path in notes for now)
--   cover_info → (moved to cover table)
--   issue_notes → notes
--
-- Dropped/moved fields:
--   volume_number → removed (redundant with volume_id)
--   crossover_title, crossover_part → use storyline tables
--   copy_count, issue_value → compute via views

INSERT INTO glox.issue (
  issue_id,
  series_id,
  volume_id,
  issue_number,
  issue_number_numeric,
  sort_order,
  issue_title,
  title_variant,
  cover_date,
  release_date,
  cover_price,
  page_count,
  notes,
  created_at,
  updated_at
)
SELECT 
  si.issue_id,
  si.title_id as series_id,
  si.volume_id,
  -- issue_number as string
  CAST(si.issue_number AS CHAR(10)) as issue_number,
  -- issue_number_numeric (same as original since yours were numeric)
  si.issue_number as issue_number_numeric,
  -- sort_order: multiply by 100 to leave room for fractional issues
  si.issue_number * 100 as sort_order,
  si.issue_title,
  NULL as title_variant,  -- Populate manually where needed
  si.issue_date as cover_date,
  NULL as release_date,  -- Not in source
  si.issue_price as cover_price,
  NULL as page_count,  -- Not in source
  -- Combine notes with cover and crossover info for reference
  CONCAT_WS('\n',
    si.issue_notes,
    CASE 
      WHEN si.cover_info IS NOT NULL AND si.cover_info != ''
      THEN CONCAT('Cover info: ', si.cover_info)
      ELSE NULL
    END,
    CASE 
      WHEN si.cover_art_file IS NOT NULL AND si.cover_art_file != ''
      THEN CONCAT('Cover file: ', si.cover_art_file)
      ELSE NULL
    END,
    CASE 
      WHEN si.crossover_title IS NOT NULL AND si.crossover_title != ''
      THEN CONCAT('Crossover: ', si.crossover_title, 
                  COALESCE(CONCAT(' (', si.crossover_part, ')'), ''))
      ELSE NULL
    END
  ) as notes,
  COALESCE(si.created_date, NOW()) as created_at,
  COALESCE(si.modified_date, NOW()) as updated_at
FROM goldilox.series_issue si
WHERE EXISTS (SELECT 1 FROM glox.series s WHERE s.series_id = si.title_id);

-- ============================================================================
-- CREATE DEFAULT COVERS
-- ============================================================================
-- Create a cover record for each issue that has cover_art_file
-- This maintains your cover image paths in the new structure

INSERT INTO glox.cover (
  issue_id,
  cover_type,
  cover_description,
  cover_image_path,
  is_primary,
  notes,
  created_at,
  updated_at
)
SELECT 
  si.issue_id,
  'standard' as cover_type,
  si.cover_info as cover_description,
  si.cover_art_file as cover_image_path,
  1 as is_primary,
  NULL as notes,
  NOW() as created_at,
  NOW() as updated_at
FROM goldilox.series_issue si
WHERE si.cover_art_file IS NOT NULL 
  AND si.cover_art_file != ''
  AND EXISTS (SELECT 1 FROM glox.issue i WHERE i.issue_id = si.issue_id);

-- ============================================================================
-- IDENTIFY CROSSOVERS FOR FUTURE STORYLINE CREATION
-- ============================================================================
-- This query helps you see what crossovers exist so you can create
-- storyline records later

SELECT 
  si.crossover_title,
  COUNT(*) as issue_count,
  GROUP_CONCAT(DISTINCT st.title ORDER BY st.title SEPARATOR ', ') as series_involved
FROM goldilox.series_issue si
JOIN goldilox.series_title st ON si.title_id = st.title_id
WHERE si.crossover_title IS NOT NULL 
  AND si.crossover_title != ''
GROUP BY si.crossover_title
ORDER BY issue_count DESC;

-- ============================================================================
-- VALIDATION QUERIES
-- ============================================================================

-- Issue counts
SELECT 'issue' as table_name,
       (SELECT COUNT(*) FROM goldilox.series_issue) as source_count,
       (SELECT COUNT(*) FROM glox.issue) as target_count;

-- Cover counts
SELECT 'covers created' as metric,
       (SELECT COUNT(*) FROM goldilox.series_issue WHERE cover_art_file IS NOT NULL AND cover_art_file != '') as source_with_covers,
       (SELECT COUNT(*) FROM glox.cover) as covers_created;

-- Sample issues with sort_order
SELECT i.issue_id, s.title, i.issue_number, i.issue_number_numeric, i.sort_order
FROM glox.issue i
JOIN glox.series s ON i.series_id = s.series_id
ORDER BY s.title, i.sort_order
LIMIT 30;

-- Check for issues with crossover notes (for future storyline creation)
SELECT COUNT(*) as issues_with_crossover_notes
FROM glox.issue
WHERE notes LIKE '%Crossover:%';

-- Issues per series (top 20)
SELECT s.title, COUNT(i.issue_id) as issue_count
FROM glox.series s
LEFT JOIN glox.issue i ON s.series_id = i.series_id
GROUP BY s.series_id, s.title
ORDER BY issue_count DESC
LIMIT 20;

-- Verify volume linkage
SELECT 
  COUNT(*) as total_issues,
  SUM(CASE WHEN volume_id IS NOT NULL THEN 1 ELSE 0 END) as with_volume,
  SUM(CASE WHEN volume_id IS NULL THEN 1 ELSE 0 END) as without_volume
FROM glox.issue;

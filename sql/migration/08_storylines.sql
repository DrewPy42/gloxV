-- Storyline Migration Script
-- Creates storyline records from crossover_title data
-- Links issues to storylines with reading order from crossover_part

USE glox;

-- ============================================================================
-- CREATE STORYLINE RECORDS
-- ============================================================================

INSERT INTO storyline (name, storyline_type, start_date, end_date, description, created_at, updated_at)
SELECT DISTINCT
  si.crossover_title as name,
  CASE 
    -- Major crossovers that span many titles
    WHEN COUNT(DISTINCT si.title_id) > 3 THEN 'crossover'
    -- Smaller events or story arcs
    ELSE 'event'
  END as storyline_type,
  MIN(si.issue_date) as start_date,
  MAX(si.issue_date) as end_date,
  CONCAT('Migrated from legacy crossover data. ', COUNT(*), ' issues across ', 
         COUNT(DISTINCT si.title_id), ' series.') as description,
  NOW() as created_at,
  NOW() as updated_at
FROM goldilox.series_issue si
WHERE si.crossover_title IS NOT NULL 
  AND si.crossover_title != ''
  AND si.crossover_title != 'None'
GROUP BY si.crossover_title;

-- ============================================================================
-- LINK ISSUES TO STORYLINES
-- ============================================================================

INSERT INTO storyline_issue (storyline_id, issue_id, part_number, part_label, reading_order)
SELECT 
  sl.storyline_id,
  i.issue_id,
  -- Try to extract numeric part from crossover_part
  CASE 
    -- Plain number: "1", "2", etc.
    WHEN si.crossover_part REGEXP '^[0-9]+$' 
      THEN CAST(si.crossover_part AS UNSIGNED)
    -- "Part X" format
    WHEN si.crossover_part REGEXP '^Part [0-9]+' 
      THEN CAST(REGEXP_SUBSTR(si.crossover_part, '[0-9]+') AS UNSIGNED)
    -- "Book X" format
    WHEN si.crossover_part REGEXP '^Book [0-9]+' 
      THEN CAST(REGEXP_SUBSTR(si.crossover_part, '[0-9]+') AS UNSIGNED)
    -- "Chapter X" format
    WHEN si.crossover_part REGEXP '^Chapter [0-9]+' 
      THEN CAST(REGEXP_SUBSTR(si.crossover_part, '[0-9]+') AS UNSIGNED)
    ELSE NULL
  END as part_number,
  -- Keep original part label for display
  si.crossover_part as part_label,
  -- Generate reading order based on: part number if available, otherwise cover date
  NULL as reading_order  -- We'll update this in a second pass
FROM goldilox.series_issue si
JOIN glox.storyline sl ON sl.name = si.crossover_title
JOIN glox.issue i ON i.issue_id = si.issue_id
WHERE si.crossover_title IS NOT NULL 
  AND si.crossover_title != ''
  AND si.crossover_title != 'None';

-- ============================================================================
-- UPDATE READING ORDER
-- ============================================================================
-- For issues with part numbers, use those
-- For issues without, use cover date order within the storyline

-- First, update reading_order for issues that have part_number
UPDATE storyline_issue si
SET reading_order = part_number * 10  -- Multiply by 10 to leave room for insertions
WHERE part_number IS NOT NULL;

-- For issues without part_number, assign reading order based on cover date
-- This uses a ranking within each storyline
DROP TEMPORARY TABLE IF EXISTS temp_reading_order;
CREATE TEMPORARY TABLE temp_reading_order AS
SELECT 
  si.storyline_issue_id,
  si.storyline_id,
  ROW_NUMBER() OVER (
    PARTITION BY si.storyline_id 
    ORDER BY i.cover_date, i.issue_id
  ) * 10 as calculated_order
FROM storyline_issue si
JOIN glox.issue i ON si.issue_id = i.issue_id
WHERE si.reading_order IS NULL;

UPDATE storyline_issue si
JOIN temp_reading_order tro ON si.storyline_issue_id = tro.storyline_issue_id
SET si.reading_order = tro.calculated_order
WHERE si.reading_order IS NULL;

DROP TEMPORARY TABLE IF EXISTS temp_reading_order;

-- ============================================================================
-- VALIDATION QUERIES
-- ============================================================================

-- Count storylines created
SELECT 'Storylines created' as metric, COUNT(*) as count FROM glox.storyline;

-- Count storyline_issue links
SELECT 'Issue links created' as metric, COUNT(*) as count FROM glox.storyline_issue;

-- Compare to source
SELECT 
  'Source crossover issues' as metric,
  COUNT(*) as count
FROM goldilox.series_issue
WHERE crossover_title IS NOT NULL 
  AND crossover_title != ''
  AND crossover_title != 'None';

-- Storylines by type
SELECT storyline_type, COUNT(*) as count
FROM glox.storyline
GROUP BY storyline_type;

-- Top 10 storylines by issue count
SELECT 
  sl.name,
  sl.storyline_type,
  sl.start_date,
  sl.end_date,
  COUNT(si.issue_id) as issue_count
FROM glox.storyline sl
LEFT JOIN glox.storyline_issue si ON sl.storyline_id = si.storyline_id
GROUP BY sl.storyline_id, sl.name, sl.storyline_type, sl.start_date, sl.end_date
ORDER BY issue_count DESC
LIMIT 10;

-- Sample: Infinity War reading order
SELECT 
  sl.name as storyline,
  s.title as series,
  i.issue_number,
  si.part_number,
  si.part_label,
  si.reading_order,
  i.cover_date
FROM glox.storyline_issue si
JOIN glox.storyline sl ON si.storyline_id = sl.storyline_id
JOIN glox.issue i ON si.issue_id = i.issue_id
JOIN glox.series s ON i.series_id = s.series_id
WHERE sl.name = 'Infinity War'
ORDER BY si.reading_order, i.cover_date;

-- Issues with parsed part numbers vs without
SELECT 
  CASE WHEN part_number IS NOT NULL THEN 'Has part number' ELSE 'No part number' END as status,
  COUNT(*) as count
FROM glox.storyline_issue
GROUP BY CASE WHEN part_number IS NOT NULL THEN 'Has part number' ELSE 'No part number' END;

-- Check for any part_labels that didn't parse
SELECT DISTINCT part_label, part_number
FROM glox.storyline_issue
WHERE part_label IS NOT NULL
ORDER BY part_label;

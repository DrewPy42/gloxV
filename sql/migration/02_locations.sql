-- Migration Phase 2: Locations
-- Source: goldilox
-- Target: glox
--
-- Parses location strings from series_title.location
-- Format: "Divider Name [box numbers]" → extracts divider name
-- All locations default to storage_type = 'cabinet'

USE glox;

-- ============================================================================
-- PARSE AND CREATE LOCATIONS
-- ============================================================================
-- First, let's see what location patterns exist

-- Preview: Show unique location values and what we'll extract
SELECT DISTINCT
  st.location as original,
  TRIM(SUBSTRING_INDEX(st.location, '[', 1)) as parsed_divider
FROM goldilox.series_title st
WHERE st.location IS NOT NULL 
  AND st.location != ''
ORDER BY parsed_divider;

-- ============================================================================
-- INSERT UNIQUE LOCATIONS
-- ============================================================================
-- Create one location record per unique divider

INSERT INTO glox.location (storage_type, divider, name, notes, created_at, updated_at)
SELECT DISTINCT
  'cabinet' as storage_type,
  TRIM(SUBSTRING_INDEX(st.location, '[', 1)) as divider,
  TRIM(SUBSTRING_INDEX(st.location, '[', 1)) as name,
  CONCAT('Migrated from: ', st.location) as notes,
  NOW() as created_at,
  NOW() as updated_at
FROM goldilox.series_title st
WHERE st.location IS NOT NULL 
  AND st.location != ''
  AND TRIM(SUBSTRING_INDEX(st.location, '[', 1)) != '';

-- ============================================================================
-- CREATE LOCATION MAPPING TABLE (Temporary)
-- ============================================================================
-- This helps us link series to locations in the next phase

DROP TEMPORARY TABLE IF EXISTS location_mapping;
CREATE TEMPORARY TABLE location_mapping AS
SELECT 
  st.title_id,
  st.location as original_location,
  TRIM(SUBSTRING_INDEX(st.location, '[', 1)) as divider,
  l.location_id
FROM goldilox.series_title st
LEFT JOIN glox.location l ON TRIM(SUBSTRING_INDEX(st.location, '[', 1)) = l.divider
WHERE st.location IS NOT NULL 
  AND st.location != '';

-- Verify the mapping looks correct
SELECT * FROM location_mapping LIMIT 20;

-- ============================================================================
-- VALIDATION QUERIES
-- ============================================================================

-- Count of locations created
SELECT COUNT(*) as location_count FROM glox.location;

-- Count of series with locations vs locations created
SELECT 
  (SELECT COUNT(DISTINCT TRIM(SUBSTRING_INDEX(location, '[', 1))) 
   FROM goldilox.series_title 
   WHERE location IS NOT NULL AND location != '') as unique_dividers_in_source,
  (SELECT COUNT(*) FROM glox.location) as locations_created;

-- Check for any series that had locations but didn't get mapped
SELECT st.title_id, st.title, st.location
FROM goldilox.series_title st
WHERE st.location IS NOT NULL 
  AND st.location != ''
  AND NOT EXISTS (
    SELECT 1 FROM glox.location l 
    WHERE l.divider = TRIM(SUBSTRING_INDEX(st.location, '[', 1))
  );

-- Preview: locations by divider name
SELECT location_id, storage_type, divider, name 
FROM glox.location 
ORDER BY divider;

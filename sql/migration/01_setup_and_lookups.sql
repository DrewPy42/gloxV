-- Migration Phase 1: Setup and Lookup Tables
-- Source: goldilox
-- Target: glox
-- 
-- Prerequisites: 
--   1. Create the glox database: CREATE DATABASE glox;
--   2. Run the v2 schema against glox first
--
-- Run this script after the schema is in place

USE glox;

-- ============================================================================
-- COMIC AGE
-- ============================================================================
-- Straight copy, adding nullable year columns (populate manually later if desired)

INSERT INTO glox.comic_age (comic_age_id, comic_age)
SELECT comic_age_id, comic_age
FROM goldilox.comic_age;

-- ============================================================================
-- CONDITION CODE
-- ============================================================================
-- Map columns, add sort_order based on condition_points (higher points = better condition)

INSERT INTO glox.condition_code (condition_id, condition_code, condition_text, condition_points, sort_order)
SELECT 
  condition_id,
  condition_code,
  condition_text,
  condition_points,
  RANK() OVER (ORDER BY condition_points DESC) as sort_order
FROM goldilox.condition_code;

-- ============================================================================
-- JOB CATEGORY (New table - seed with standard categories)
-- ============================================================================

INSERT INTO glox.job_category (category_name) VALUES
('Writing'),
('Art'),
('Coloring'),
('Lettering'),
('Editorial'),
('Production'),
('Other');

-- ============================================================================
-- JOB TITLE
-- ============================================================================
-- Copy existing, assign categories based on common patterns
-- You may need to adjust these mappings based on your actual data

INSERT INTO glox.job_title (job_title_id, job_title, job_category_id)
SELECT 
  jt.job_title_id,
  jt.job_title,
  CASE 
    WHEN LOWER(jt.job_title) LIKE '%writ%' THEN (SELECT job_category_id FROM glox.job_category WHERE category_name = 'Writing')
    WHEN LOWER(jt.job_title) LIKE '%plot%' THEN (SELECT job_category_id FROM glox.job_category WHERE category_name = 'Writing')
    WHEN LOWER(jt.job_title) LIKE '%script%' THEN (SELECT job_category_id FROM glox.job_category WHERE category_name = 'Writing')
    WHEN LOWER(jt.job_title) LIKE '%pencil%' THEN (SELECT job_category_id FROM glox.job_category WHERE category_name = 'Art')
    WHEN LOWER(jt.job_title) LIKE '%ink%' THEN (SELECT job_category_id FROM glox.job_category WHERE category_name = 'Art')
    WHEN LOWER(jt.job_title) LIKE '%artist%' THEN (SELECT job_category_id FROM glox.job_category WHERE category_name = 'Art')
    WHEN LOWER(jt.job_title) LIKE '%cover%' THEN (SELECT job_category_id FROM glox.job_category WHERE category_name = 'Art')
    WHEN LOWER(jt.job_title) LIKE '%draw%' THEN (SELECT job_category_id FROM glox.job_category WHERE category_name = 'Art')
    WHEN LOWER(jt.job_title) LIKE '%color%' THEN (SELECT job_category_id FROM glox.job_category WHERE category_name = 'Coloring')
    WHEN LOWER(jt.job_title) LIKE '%colour%' THEN (SELECT job_category_id FROM glox.job_category WHERE category_name = 'Coloring')
    WHEN LOWER(jt.job_title) LIKE '%letter%' THEN (SELECT job_category_id FROM glox.job_category WHERE category_name = 'Lettering')
    WHEN LOWER(jt.job_title) LIKE '%edit%' THEN (SELECT job_category_id FROM glox.job_category WHERE category_name = 'Editorial')
    ELSE (SELECT job_category_id FROM glox.job_category WHERE category_name = 'Other')
  END as job_category_id
FROM goldilox.job_title jt;

-- ============================================================================
-- PUBLISHER
-- ============================================================================
-- Rename logo → logo_path, publisher_notes → notes

INSERT INTO glox.publisher (publisher_id, publisher_name, logo_path, website, notes, created_at, updated_at)
SELECT 
  publisher_id,
  publisher_name,
  logo as logo_path,
  website,
  publisher_notes as notes,
  NOW() as created_at,
  NOW() as updated_at
FROM goldilox.publisher;

-- ============================================================================
-- PERSON
-- ============================================================================
-- Straight copy with timestamps

-- Delete what was inserted so far and re-run
DELETE FROM glox.person;

INSERT INTO glox.person (person_id, first_name, last_name, biography, created_at, updated_at)
SELECT 
  person_id,
  first_name,
  COALESCE(last_name, first_name, 'Unknown') as last_name,
  biography,
  NOW() as created_at,
  NOW() as updated_at
FROM goldilox.person
WHERE person_id IS NOT NULL;

-- ============================================================================
-- VALIDATION QUERIES
-- ============================================================================
-- Run these after migration to verify counts match

SELECT 'comic_age' as table_name, 
       (SELECT COUNT(*) FROM goldilox.comic_age) as source_count,
       (SELECT COUNT(*) FROM glox.comic_age) as target_count;

SELECT 'condition_code' as table_name,
       (SELECT COUNT(*) FROM goldilox.condition_code) as source_count,
       (SELECT COUNT(*) FROM glox.condition_code) as target_count;

SELECT 'job_title' as table_name,
       (SELECT COUNT(*) FROM goldilox.job_title) as source_count,
       (SELECT COUNT(*) FROM glox.job_title) as target_count;

SELECT 'publisher' as table_name,
       (SELECT COUNT(*) FROM goldilox.publisher) as source_count,
       (SELECT COUNT(*) FROM glox.publisher) as target_count;

SELECT 'person' as table_name,
       (SELECT COUNT(*) FROM goldilox.person) as source_count,
       (SELECT COUNT(*) FROM glox.person) as target_count;

-- Check job category assignments
SELECT jc.category_name, COUNT(jt.job_title_id) as title_count
FROM glox.job_category jc
LEFT JOIN glox.job_title jt ON jc.job_category_id = jt.job_category_id
GROUP BY jc.category_name
ORDER BY jc.category_name;

-- Migration Phase 7: Final Validation
-- Source: goldilox
-- Target: glox
--
-- Comprehensive validation of the migration

USE glox;

-- ============================================================================
-- RECORD COUNT COMPARISON
-- ============================================================================

SELECT '=== RECORD COUNTS ===' as section;

SELECT 
  'comic_age' as table_name,
  (SELECT COUNT(*) FROM goldilox.comic_age) as source,
  (SELECT COUNT(*) FROM glox.comic_age) as target,
  CASE 
    WHEN (SELECT COUNT(*) FROM goldilox.comic_age) = (SELECT COUNT(*) FROM glox.comic_age) 
    THEN '✓ OK' 
    ELSE '✗ MISMATCH' 
  END as status
UNION ALL
SELECT 
  'condition_code',
  (SELECT COUNT(*) FROM goldilox.condition_code),
  (SELECT COUNT(*) FROM glox.condition_code),
  CASE 
    WHEN (SELECT COUNT(*) FROM goldilox.condition_code) = (SELECT COUNT(*) FROM glox.condition_code) 
    THEN '✓ OK' 
    ELSE '✗ MISMATCH' 
  END
UNION ALL
SELECT 
  'job_title',
  (SELECT COUNT(*) FROM goldilox.job_title),
  (SELECT COUNT(*) FROM glox.job_title),
  CASE 
    WHEN (SELECT COUNT(*) FROM goldilox.job_title) = (SELECT COUNT(*) FROM glox.job_title) 
    THEN '✓ OK' 
    ELSE '✗ MISMATCH' 
  END
UNION ALL
SELECT 
  'publisher',
  (SELECT COUNT(*) FROM goldilox.publisher),
  (SELECT COUNT(*) FROM glox.publisher),
  CASE 
    WHEN (SELECT COUNT(*) FROM goldilox.publisher) = (SELECT COUNT(*) FROM glox.publisher) 
    THEN '✓ OK' 
    ELSE '✗ MISMATCH' 
  END
UNION ALL
SELECT 
  'person',
  (SELECT COUNT(*) FROM goldilox.person),
  (SELECT COUNT(*) FROM glox.person),
  CASE 
    WHEN (SELECT COUNT(*) FROM goldilox.person) = (SELECT COUNT(*) FROM glox.person) 
    THEN '✓ OK' 
    ELSE '✗ MISMATCH' 
  END
UNION ALL
SELECT 
  'series (was series_title)',
  (SELECT COUNT(*) FROM goldilox.series_title),
  (SELECT COUNT(*) FROM glox.series),
  CASE 
    WHEN (SELECT COUNT(*) FROM goldilox.series_title) = (SELECT COUNT(*) FROM glox.series) 
    THEN '✓ OK' 
    ELSE '✗ MISMATCH' 
  END
UNION ALL
SELECT 
  'volume (was series_volume)',
  (SELECT COUNT(*) FROM goldilox.series_volume),
  (SELECT COUNT(*) FROM glox.volume),
  CASE 
    WHEN (SELECT COUNT(*) FROM goldilox.series_volume) = (SELECT COUNT(*) FROM glox.volume) 
    THEN '✓ OK' 
    ELSE '✗ MISMATCH' 
  END
UNION ALL
SELECT 
  'issue (was series_issue)',
  (SELECT COUNT(*) FROM goldilox.series_issue),
  (SELECT COUNT(*) FROM glox.issue),
  CASE 
    WHEN (SELECT COUNT(*) FROM goldilox.series_issue) = (SELECT COUNT(*) FROM glox.issue) 
    THEN '✓ OK' 
    ELSE '✗ MISMATCH' 
  END
UNION ALL
SELECT 
  'copy (was series_copy)',
  (SELECT COUNT(*) FROM goldilox.series_copy),
  (SELECT COUNT(*) FROM glox.copy),
  CASE 
    WHEN (SELECT COUNT(*) FROM goldilox.series_copy) = (SELECT COUNT(*) FROM glox.copy) 
    THEN '✓ OK' 
    ELSE '✗ MISMATCH' 
  END
UNION ALL
SELECT 
  'issue_credit',
  (SELECT COUNT(*) FROM goldilox.issue_credit),
  (SELECT COUNT(*) FROM glox.issue_credit),
  CASE 
    WHEN (SELECT COUNT(*) FROM goldilox.issue_credit) = (SELECT COUNT(*) FROM glox.issue_credit) 
    THEN '✓ OK' 
    ELSE '✗ MISMATCH' 
  END;

-- ============================================================================
-- VALUE COMPARISON
-- ============================================================================

SELECT '=== VALUE TOTALS ===' as section;

SELECT 
  'Total Copy Value' as metric,
  (SELECT SUM(current_value) FROM goldilox.series_copy) as source_value,
  (SELECT SUM(current_value) FROM glox.copy) as target_value,
  CASE 
    WHEN ABS(COALESCE((SELECT SUM(current_value) FROM goldilox.series_copy), 0) - 
             COALESCE((SELECT SUM(current_value) FROM glox.copy), 0)) < 0.01
    THEN '✓ OK' 
    ELSE '✗ MISMATCH' 
  END as status
UNION ALL
SELECT 
  'Total Purchase Price',
  (SELECT SUM(issue_price) FROM goldilox.series_copy),
  (SELECT SUM(purchase_price) FROM glox.copy),
  CASE 
    WHEN ABS(COALESCE((SELECT SUM(issue_price) FROM goldilox.series_copy), 0) - 
             COALESCE((SELECT SUM(purchase_price) FROM glox.copy), 0)) < 0.01
    THEN '✓ OK' 
    ELSE '✗ MISMATCH' 
  END;

-- ============================================================================
-- NEW TABLES SUMMARY
-- ============================================================================

SELECT '=== NEW TABLES CREATED ===' as section;

SELECT 'location' as table_name, COUNT(*) as record_count FROM glox.location
UNION ALL
SELECT 'cover', COUNT(*) FROM glox.cover
UNION ALL
SELECT 'series_link', COUNT(*) FROM glox.series_link
UNION ALL
SELECT 'job_category', COUNT(*) FROM glox.job_category;

-- ============================================================================
-- EMPTY TABLES (Ready for future data)
-- ============================================================================

SELECT '=== EMPTY TABLES (Ready for data) ===' as section;

SELECT 'collected_edition' as table_name, COUNT(*) as record_count FROM glox.collected_edition
UNION ALL
SELECT 'collected_edition_issue', COUNT(*) FROM glox.collected_edition_issue
UNION ALL
SELECT 'storyline', COUNT(*) FROM glox.storyline
UNION ALL
SELECT 'storyline_issue', COUNT(*) FROM glox.storyline_issue
UNION ALL
SELECT 'tag', COUNT(*) FROM glox.tag
UNION ALL
SELECT 'taggable', COUNT(*) FROM glox.taggable
UNION ALL
SELECT 'person_alias', COUNT(*) FROM glox.person_alias
UNION ALL
SELECT 'value_history', COUNT(*) FROM glox.value_history;

-- ============================================================================
-- SPOT CHECK: RANDOM SERIES COMPARISON
-- ============================================================================

SELECT '=== SPOT CHECK: Sample Series ===' as section;

-- Pick a few series and compare details
SELECT 
  'X-Men (or similar)' as check_name,
  old.title_id as old_id,
  new.series_id as new_id,
  old.title as old_title,
  new.title as new_title,
  (SELECT COUNT(*) FROM goldilox.series_issue si WHERE si.title_id = old.title_id) as old_issue_count,
  (SELECT COUNT(*) FROM glox.issue i WHERE i.series_id = new.series_id) as new_issue_count
FROM goldilox.series_title old
JOIN glox.series new ON old.title_id = new.series_id
WHERE old.title LIKE '%X-Men%'
LIMIT 5;

-- ============================================================================
-- DATA INTEGRITY CHECKS
-- ============================================================================

SELECT '=== DATA INTEGRITY ===' as section;

-- Orphan checks
SELECT 'Issues without series' as check_type, COUNT(*) as count
FROM glox.issue i
WHERE NOT EXISTS (SELECT 1 FROM glox.series s WHERE s.series_id = i.series_id)
UNION ALL
SELECT 'Copies without issues', COUNT(*)
FROM glox.copy c
WHERE NOT EXISTS (SELECT 1 FROM glox.issue i WHERE i.issue_id = c.issue_id)
UNION ALL
SELECT 'Volumes without series', COUNT(*)
FROM glox.volume v
WHERE NOT EXISTS (SELECT 1 FROM glox.series s WHERE s.series_id = v.series_id)
UNION ALL
SELECT 'Series links with invalid from_series', COUNT(*)
FROM glox.series_link sl
WHERE NOT EXISTS (SELECT 1 FROM glox.series s WHERE s.series_id = sl.from_series_id)
UNION ALL
SELECT 'Series links with invalid to_series', COUNT(*)
FROM glox.series_link sl
WHERE NOT EXISTS (SELECT 1 FROM glox.series s WHERE s.series_id = sl.to_series_id);

-- ============================================================================
-- COLLECTION SUMMARY
-- ============================================================================

SELECT '=== COLLECTION SUMMARY ===' as section;

SELECT 
  (SELECT COUNT(*) FROM glox.series WHERE deleted_at IS NULL) as total_series,
  (SELECT COUNT(*) FROM glox.volume WHERE deleted_at IS NULL) as total_volumes,
  (SELECT COUNT(*) FROM glox.issue WHERE deleted_at IS NULL) as total_issues,
  (SELECT COUNT(*) FROM glox.copy WHERE deleted_at IS NULL) as total_copies,
  (SELECT SUM(current_value) FROM glox.copy WHERE deleted_at IS NULL) as total_value;

-- Top 10 publishers by issue count
SELECT '=== TOP PUBLISHERS ===' as section;

SELECT p.publisher_name, COUNT(DISTINCT i.issue_id) as issue_count
FROM glox.publisher p
JOIN glox.series s ON p.publisher_id = s.publisher_id
JOIN glox.issue i ON s.series_id = i.series_id
WHERE s.deleted_at IS NULL AND i.deleted_at IS NULL
GROUP BY p.publisher_id, p.publisher_name
ORDER BY issue_count DESC
LIMIT 10;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

SELECT '=== MIGRATION VALIDATION COMPLETE ===' as section;
SELECT 'Review any MISMATCH entries above and investigate before proceeding.' as note;

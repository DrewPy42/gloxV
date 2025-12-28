-- Migration Phase 6: Credits
-- Source: goldilox
-- Target: glox
--
-- Migrates issue_credit → issue_credit
-- Job categories were already set up in Phase 1

USE glox;

-- ============================================================================
-- ISSUE CREDITS
-- ============================================================================
-- Straight migration - structure is the same

INSERT INTO glox.issue_credit (
  issue_credit_id,
  issue_id,
  person_id,
  job_title_id,
  notes
)
SELECT 
  ic.issue_credit_id,
  ic.issue_id,
  ic.person_id,
  ic.job_title_id,
  NULL as notes
FROM goldilox.issue_credit ic
WHERE EXISTS (SELECT 1 FROM glox.issue i WHERE i.issue_id = ic.issue_id)
  AND EXISTS (SELECT 1 FROM glox.person p WHERE p.person_id = ic.person_id)
  AND EXISTS (SELECT 1 FROM glox.job_title jt WHERE jt.job_title_id = ic.job_title_id);

-- ============================================================================
-- VALIDATION QUERIES
-- ============================================================================

-- Credit counts
SELECT 'issue_credit' as table_name,
       (SELECT COUNT(*) FROM goldilox.issue_credit) as source_count,
       (SELECT COUNT(*) FROM glox.issue_credit) as target_count;

-- Credits by job category
SELECT jc.category_name, COUNT(ic.issue_credit_id) as credit_count
FROM glox.job_category jc
LEFT JOIN glox.job_title jt ON jc.job_category_id = jt.job_category_id
LEFT JOIN glox.issue_credit ic ON jt.job_title_id = ic.job_title_id
GROUP BY jc.job_category_id, jc.category_name
ORDER BY credit_count DESC;

-- Credits by job title
SELECT jt.job_title, jc.category_name, COUNT(ic.issue_credit_id) as credit_count
FROM glox.job_title jt
LEFT JOIN glox.job_category jc ON jt.job_category_id = jc.job_category_id
LEFT JOIN glox.issue_credit ic ON jt.job_title_id = ic.job_title_id
GROUP BY jt.job_title_id, jt.job_title, jc.category_name
ORDER BY credit_count DESC
LIMIT 20;

-- Most credited people
SELECT p.first_name, p.last_name, COUNT(ic.issue_credit_id) as credit_count
FROM glox.person p
LEFT JOIN glox.issue_credit ic ON p.person_id = ic.person_id
GROUP BY p.person_id, p.first_name, p.last_name
ORDER BY credit_count DESC
LIMIT 20;

-- Sample credits with full details
SELECT 
  s.title,
  i.issue_number,
  p.first_name,
  p.last_name,
  jt.job_title,
  jc.category_name
FROM glox.issue_credit ic
JOIN glox.issue i ON ic.issue_id = i.issue_id
JOIN glox.series s ON i.series_id = s.series_id
JOIN glox.person p ON ic.person_id = p.person_id
JOIN glox.job_title jt ON ic.job_title_id = jt.job_title_id
LEFT JOIN glox.job_category jc ON jt.job_category_id = jc.job_category_id
ORDER BY s.title, i.sort_order
LIMIT 30;

-- Check for orphaned credits (shouldn't be any after our WHERE filters)
SELECT 'orphaned by issue' as check_type, COUNT(*) as count
FROM glox.issue_credit ic
WHERE NOT EXISTS (SELECT 1 FROM glox.issue i WHERE i.issue_id = ic.issue_id)
UNION ALL
SELECT 'orphaned by person' as check_type, COUNT(*) as count
FROM glox.issue_credit ic
WHERE NOT EXISTS (SELECT 1 FROM glox.person p WHERE p.person_id = ic.person_id)
UNION ALL
SELECT 'orphaned by job_title' as check_type, COUNT(*) as count
FROM glox.issue_credit ic
WHERE NOT EXISTS (SELECT 1 FROM glox.job_title jt WHERE jt.job_title_id = ic.job_title_id);

-- Migration Phase 5: Copies
-- Source: goldilox
-- Target: glox
--
-- Migrates series_copy → copy

USE glox;

-- ============================================================================
-- COPIES
-- ============================================================================
-- Map columns:
--   copy_id → copy_id
--   issue_id → issue_id
--   issue_price → purchase_price
--   current_value → current_value
--   condition_id → condition_id
--   copy_notes → notes
--   created_date → created_at
--   modified_date → updated_at
--
-- New fields (defaults):
--   cover_id → NULL (link to cover variant later if needed)
--   format → 'floppy' (default, update during inventory for slabs/digital)
--   value_date → NULL (set to today if current_value exists)
--   purchase_date → NULL (not in source)
--   purchase_source → NULL (not in source)
--   location_id → NULL (inherits from series default)

INSERT INTO glox.copy (
  copy_id,
  issue_id,
  cover_id,
  condition_id,
  format,
  purchase_price,
  current_value,
  value_date,
  purchase_date,
  purchase_source,
  location_id,
  grade,
  certification_number,
  file_path,
  notes,
  created_at,
  updated_at
)
SELECT 
  sc.copy_id,
  sc.issue_id,
  -- Link to the primary cover for this issue if one exists
  (SELECT c.cover_id FROM glox.cover c 
   WHERE c.issue_id = sc.issue_id AND c.is_primary = 1 
   LIMIT 1) as cover_id,
  sc.condition_id,
  'floppy' as format,
  sc.issue_price as purchase_price,
  sc.current_value,
  CASE WHEN sc.current_value IS NOT NULL AND sc.current_value > 0 
       THEN CURDATE() 
       ELSE NULL 
  END as value_date,
  NULL as purchase_date,
  NULL as purchase_source,
  NULL as location_id,  -- Will inherit from series
  NULL as grade,
  NULL as certification_number,
  NULL as file_path,
  sc.copy_notes as notes,
  COALESCE(sc.created_date, NOW()) as created_at,
  COALESCE(sc.modified_date, NOW()) as updated_at
FROM goldilox.series_copy sc
WHERE EXISTS (SELECT 1 FROM glox.issue i WHERE i.issue_id = sc.issue_id);

-- ============================================================================
-- VALIDATION QUERIES
-- ============================================================================

-- Copy counts
SELECT 'copy' as table_name,
       (SELECT COUNT(*) FROM goldilox.series_copy) as source_count,
       (SELECT COUNT(*) FROM glox.copy) as target_count;

-- Copies by condition
SELECT cc.condition_code, cc.condition_text, COUNT(c.copy_id) as copy_count
FROM glox.condition_code cc
LEFT JOIN glox.copy c ON cc.condition_id = c.condition_id
GROUP BY cc.condition_id, cc.condition_code, cc.condition_text
ORDER BY cc.sort_order;

-- Total collection value
SELECT 
  COUNT(*) as total_copies,
  SUM(purchase_price) as total_cost,
  SUM(current_value) as total_value,
  SUM(current_value) - SUM(purchase_price) as gain_loss
FROM glox.copy
WHERE deleted_at IS NULL;

-- Sample copies with their issues
SELECT 
  c.copy_id,
  s.title,
  i.issue_number,
  cc.condition_code,
  c.purchase_price,
  c.current_value
FROM glox.copy c
JOIN glox.issue i ON c.issue_id = i.issue_id
JOIN glox.series s ON i.series_id = s.series_id
LEFT JOIN glox.condition_code cc ON c.condition_id = cc.condition_id
ORDER BY s.title, i.sort_order
LIMIT 30;

-- Copies that might be slabs or special (check notes for clues)
SELECT c.copy_id, s.title, i.issue_number, c.notes
FROM glox.copy c
JOIN glox.issue i ON c.issue_id = i.issue_id
JOIN glox.series s ON i.series_id = s.series_id
WHERE c.notes LIKE '%slab%'
   OR c.notes LIKE '%CGC%'
   OR c.notes LIKE '%CBCS%'
   OR c.notes LIKE '%signed%'
   OR c.notes LIKE '%signature%'
   OR c.notes LIKE '%graded%'
LIMIT 30;

-- High value copies (adjust threshold as needed)
SELECT 
  c.copy_id,
  s.title,
  i.issue_number,
  cc.condition_code,
  c.current_value
FROM glox.copy c
JOIN glox.issue i ON c.issue_id = i.issue_id
JOIN glox.series s ON i.series_id = s.series_id
LEFT JOIN glox.condition_code cc ON c.condition_id = cc.condition_id
WHERE c.current_value > 100
ORDER BY c.current_value DESC
LIMIT 30;

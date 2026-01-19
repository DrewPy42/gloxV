-- ============================================================================
-- PHASE 1: MIGRATE COVER SYSTEM FROM ISSUE-BASED TO COPY-BASED
-- ============================================================================
-- This migration changes the cover table to link covers to copies instead of issues.
-- This allows multiple covers for the same issue (e.g., variant covers).
--
-- Steps:
-- 1. Make issue_id nullable and add copy_id column (if not already done)
-- 2. For each existing cover, create copies for each physical copy of that issue
-- 3. Link copies to their covers
-- 4. Remove issue_id column (after verification)
--
-- IMPORTANT: This script should be run BEFORE Phase 2 (duplicate consolidation)
-- ============================================================================

USE glox;

-- Start transaction for safety
START TRANSACTION;

-- ============================================================================
-- STEP 1: Add copy_id column and make issue_id nullable (if not already done)
-- ============================================================================
-- Check if copy_id column exists, if not add it
SET @column_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'glox' AND TABLE_NAME = 'cover' AND COLUMN_NAME = 'copy_id');

SET @sql = IF(@column_exists = 0,
    'ALTER TABLE cover ADD COLUMN copy_id INT NULL AFTER cover_id, ADD INDEX idx_copy_id (copy_id)',
    'SELECT "copy_id column already exists"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Make issue_id nullable
ALTER TABLE cover MODIFY COLUMN issue_id INT NULL;

-- ============================================================================
-- STEP 2: Migrate existing issue-based covers to copy-based
-- ============================================================================
-- Strategy: For each cover record with issue_id, create duplicate cover records
-- for each copy of that issue, then delete the original issue-based cover

-- Create new cover records for each copy, based on existing issue-based covers
INSERT INTO cover (copy_id, cover_type, cover_description, cover_artist_person_id,
                   cover_image_path, is_primary, notes, created_at, updated_at)
SELECT
    cp.copy_id,
    cov.cover_type,
    cov.cover_description,
    cov.cover_artist_person_id,
    cov.cover_image_path,
    cov.is_primary,
    -- Preserve cover notes and add cover info from issue notes if available
    CONCAT_WS('\n',
        cov.notes,
        CASE
            WHEN i.notes LIKE '%Cover info:%' THEN
                TRIM(TRAILING '\n' FROM SUBSTRING_INDEX(SUBSTRING_INDEX(i.notes, 'Cover info: ', -1), '\n', 1))
            ELSE NULL
        END
    ) as notes,
    NOW() as created_at,
    NOW() as updated_at
FROM cover cov
JOIN issue i ON cov.issue_id = i.issue_id
JOIN copy cp ON i.issue_id = cp.issue_id
WHERE cov.issue_id IS NOT NULL  -- Only migrate issue-based covers
  AND cov.copy_id IS NULL        -- Skip any already migrated
  AND i.deleted_at IS NULL
  AND cp.deleted_at IS NULL;

-- ============================================================================
-- STEP 3: Update copy.cover_id to link copies to their new covers
-- ============================================================================
UPDATE copy cp
JOIN cover cov ON cp.copy_id = cov.copy_id
SET cp.cover_id = cov.cover_id
WHERE cp.cover_id IS NULL
  AND cov.copy_id IS NOT NULL;

-- ============================================================================
-- STEP 4: Delete old issue-based cover records
-- ============================================================================
-- Now that we have copy-based covers, remove the old issue-based ones
DELETE FROM cover
WHERE issue_id IS NOT NULL
  AND copy_id IS NULL;

-- ============================================================================
-- STEP 5: Verification
-- ============================================================================
-- Check that we created the expected number of cover records
SELECT
    'Cover records (copy-based)' as check_name,
    COUNT(*) as count
FROM cover
WHERE copy_id IS NOT NULL;

-- Check that copies are linked to covers
SELECT
    'Copies with covers' as check_name,
    COUNT(*) as count
FROM copy
WHERE cover_id IS NOT NULL;

-- Check for any orphaned covers (should be 0)
SELECT
    'Orphaned covers (should be 0)' as check_name,
    COUNT(*) as count
FROM cover
WHERE copy_id IS NULL;

-- Check that no issue-based covers remain
SELECT
    'Old issue-based covers (should be 0)' as check_name,
    COUNT(*) as count
FROM cover
WHERE issue_id IS NOT NULL;

-- ============================================================================
-- STEP 6: Drop issue_id column from cover table (after manual verification)
-- ============================================================================
-- UNCOMMENT AFTER VERIFYING THE MIGRATION IS SUCCESSFUL:
-- ALTER TABLE cover DROP FOREIGN KEY cover_ibfk_1;
-- ALTER TABLE cover DROP COLUMN issue_id;

-- ============================================================================
-- STEP 7: Add foreign key constraint for copy_id
-- ============================================================================
-- UNCOMMENT AFTER DROPPING issue_id:
-- ALTER TABLE cover
-- ADD CONSTRAINT fk_cover_copy
-- FOREIGN KEY (copy_id) REFERENCES copy(copy_id) ON DELETE CASCADE;

-- Make copy_id NOT NULL after everything is migrated:
-- ALTER TABLE cover MODIFY copy_id INT NOT NULL;

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these queries after migration to verify success:

-- 1. Check total counts
-- SELECT
--     (SELECT COUNT(*) FROM issue WHERE notes LIKE '%Cover file:%') as issues_with_covers,
--     (SELECT COUNT(*) FROM cover WHERE copy_id IS NOT NULL) as cover_records,
--     (SELECT COUNT(*) FROM copy WHERE cover_id IS NOT NULL) as copies_with_covers;

-- 2. Check a specific example (X-Men #1)
-- SELECT
--     i.issue_id, i.issue_number, i.notes,
--     c.copy_id, c.format,
--     cov.cover_id, cov.cover_image_path, cov.notes as cover_notes
-- FROM issue i
-- JOIN copy c ON i.issue_id = c.issue_id
-- LEFT JOIN cover cov ON c.cover_id = cov.cover_id
-- WHERE i.series_id = 235 AND i.issue_number = '1'
--   AND i.deleted_at IS NULL
-- ORDER BY i.issue_id, c.copy_id;

-- 3. Check for any issues
-- SELECT 'Copies without covers' as issue, COUNT(*) as count
-- FROM copy c
-- JOIN issue i ON c.issue_id = i.issue_id
-- WHERE c.cover_id IS NULL
--   AND i.notes LIKE '%Cover file:%'
--   AND c.deleted_at IS NULL
--   AND i.deleted_at IS NULL;

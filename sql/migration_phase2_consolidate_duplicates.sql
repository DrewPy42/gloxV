-- ============================================================================
-- PHASE 2: CONSOLIDATE DUPLICATE ISSUE RECORDS
-- ============================================================================
-- This migration consolidates duplicate issue records that represent the same
-- issue with different covers (e.g., 5 X-Men #1 records become 1 issue with 5 copies).
--
-- Steps:
-- 1. Identify duplicate issue groups
-- 2. For each group, select canonical issue (lowest issue_id)
-- 3. Move all copies from duplicates to canonical issue
-- 4. Move all related data (credits, storylines, etc.)
-- 5. Soft-delete duplicate issue records
--
-- IMPORTANT: Run AFTER Phase 1 (cover migration is complete)
-- ============================================================================

USE glox;

-- Start transaction for safety
START TRANSACTION;

-- ============================================================================
-- STEP 1: Create temporary table to identify duplicates
-- ============================================================================
DROP TEMPORARY TABLE IF EXISTS issue_duplicates;

CREATE TEMPORARY TABLE issue_duplicates AS
SELECT
    series_id,
    volume_id,
    issue_number,
    MIN(issue_id) as canonical_issue_id,
    GROUP_CONCAT(issue_id ORDER BY issue_id) as all_issue_ids,
    COUNT(*) as duplicate_count
FROM issue
WHERE deleted_at IS NULL
GROUP BY series_id, volume_id, issue_number
HAVING COUNT(*) > 1;

-- Show what we found
SELECT
    CONCAT('Found ', COUNT(*), ' duplicate groups with ', SUM(duplicate_count - 1), ' extra issues to consolidate') as summary
FROM issue_duplicates;

-- ============================================================================
-- STEP 2: Create temporary table with issue pairs (canonical <-> duplicate)
-- ============================================================================
DROP TEMPORARY TABLE IF EXISTS issue_consolidation_map;

CREATE TEMPORARY TABLE issue_consolidation_map (
    canonical_issue_id INT,
    duplicate_issue_id INT,
    PRIMARY KEY (canonical_issue_id, duplicate_issue_id)
);

-- Populate the map with all duplicate pairs
-- This requires a more complex query since we need to expand the GROUP_CONCAT
INSERT INTO issue_consolidation_map (canonical_issue_id, duplicate_issue_id)
SELECT DISTINCT
    id.canonical_issue_id,
    i.issue_id as duplicate_issue_id
FROM issue_duplicates id
JOIN issue i ON i.series_id = id.series_id
    AND i.volume_id = id.volume_id
    AND i.issue_number = id.issue_number
    AND i.issue_id != id.canonical_issue_id
    AND i.deleted_at IS NULL;

-- Verify the map
SELECT
    COUNT(*) as duplicate_issues_to_consolidate
FROM issue_consolidation_map;

-- ============================================================================
-- STEP 3: Consolidate copies from duplicate issues to canonical issues
-- ============================================================================
-- Move all copies from duplicate issues to their canonical issue
UPDATE copy c
JOIN issue_consolidation_map icm ON c.issue_id = icm.duplicate_issue_id
SET c.issue_id = icm.canonical_issue_id
WHERE c.deleted_at IS NULL;

-- ============================================================================
-- STEP 4: Consolidate credits from duplicate issues to canonical issues
-- ============================================================================
-- Move credits, avoiding duplicates (same person, same job, same canonical issue)
INSERT IGNORE INTO issue_credit (issue_id, person_id, job_title_id, notes)
SELECT
    icm.canonical_issue_id,
    ic.person_id,
    ic.job_title_id,
    ic.notes
FROM issue_credit ic
JOIN issue_consolidation_map icm ON ic.issue_id = icm.duplicate_issue_id;

-- ============================================================================
-- STEP 5: Consolidate storyline associations
-- ============================================================================
-- Move storyline associations, avoiding duplicates
INSERT IGNORE INTO storyline_issue (storyline_id, issue_id, part_number, part_label, reading_order)
SELECT
    si.storyline_id,
    icm.canonical_issue_id,
    si.part_number,
    si.part_label,
    si.reading_order
FROM storyline_issue si
JOIN issue_consolidation_map icm ON si.issue_id = icm.duplicate_issue_id;

-- ============================================================================
-- STEP 6: Consolidate tags (if any are attached to issues)
-- ============================================================================
-- Move tags, avoiding duplicates
INSERT IGNORE INTO taggable (tag_id, entity_type, entity_id)
SELECT
    t.tag_id,
    'issue' as entity_type,
    icm.canonical_issue_id
FROM taggable t
JOIN issue_consolidation_map icm ON t.entity_id = icm.duplicate_issue_id
WHERE t.entity_type = 'issue';

-- ============================================================================
-- STEP 7: Consolidate collected edition associations
-- ============================================================================
-- Move collected edition associations, avoiding duplicates
INSERT IGNORE INTO collected_edition_issue (collected_edition_id, issue_id, sequence_order, page_start, page_end, notes)
SELECT
    cei.collected_edition_id,
    icm.canonical_issue_id,
    cei.sequence_order,
    cei.page_start,
    cei.page_end,
    cei.notes
FROM collected_edition_issue cei
JOIN issue_consolidation_map icm ON cei.issue_id = icm.duplicate_issue_id;

-- ============================================================================
-- STEP 8: Merge notes from duplicate issues into canonical issue
-- ============================================================================
-- Preserve any unique notes from duplicates
-- Create a temporary table to hold the merged notes
DROP TEMPORARY TABLE IF EXISTS merged_notes;
CREATE TEMPORARY TABLE merged_notes AS
SELECT
    icm.canonical_issue_id,
    GROUP_CONCAT(DISTINCT dup.notes SEPARATOR '\n') as additional_notes
FROM issue_consolidation_map icm
JOIN issue dup ON dup.issue_id = icm.duplicate_issue_id
WHERE dup.notes IS NOT NULL
  AND dup.notes != ''
GROUP BY icm.canonical_issue_id;

-- Update canonical issues with merged notes
UPDATE issue i
JOIN merged_notes mn ON i.issue_id = mn.canonical_issue_id
SET i.notes = CONCAT_WS('\n', i.notes, mn.additional_notes),
    i.updated_at = NOW()
WHERE i.deleted_at IS NULL
  AND mn.additional_notes IS NOT NULL;

-- ============================================================================
-- STEP 9: Soft-delete duplicate issue records
-- ============================================================================
UPDATE issue i
JOIN issue_consolidation_map icm ON i.issue_id = icm.duplicate_issue_id
SET i.deleted_at = NOW()
WHERE i.deleted_at IS NULL;

-- ============================================================================
-- STEP 10: Verification
-- ============================================================================
-- Show summary of consolidation
SELECT
    'Duplicate issues soft-deleted' as action,
    COUNT(*) as count
FROM issue
WHERE deleted_at IS NOT NULL
  AND deleted_at > DATE_SUB(NOW(), INTERVAL 1 MINUTE);

-- Show copies consolidated
SELECT
    'Copies now on canonical issues' as action,
    COUNT(*) as count
FROM copy c
JOIN issue_consolidation_map icm ON c.issue_id = icm.canonical_issue_id
WHERE c.deleted_at IS NULL;

-- Show remaining duplicates (should be 0)
SELECT
    'Remaining duplicate groups (should be 0)' as check_name,
    COUNT(*) as count
FROM (
    SELECT series_id, volume_id, issue_number, COUNT(*) as cnt
    FROM issue
    WHERE deleted_at IS NULL
    GROUP BY series_id, volume_id, issue_number
    HAVING COUNT(*) > 1
) as remaining_dupes;

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these queries after migration to verify success:

-- 1. Check X-Men #1 consolidation
-- SELECT
--     i.issue_id,
--     i.issue_number,
--     i.deleted_at,
--     COUNT(c.copy_id) as copy_count,
--     GROUP_CONCAT(c.copy_id ORDER BY c.copy_id) as copy_ids
-- FROM issue i
-- LEFT JOIN copy c ON i.issue_id = c.issue_id AND c.deleted_at IS NULL
-- WHERE i.series_id = 235
--   AND i.issue_number = '1'
-- GROUP BY i.issue_id
-- ORDER BY i.deleted_at IS NULL DESC, i.issue_id;

-- 2. Check overall statistics
-- SELECT
--     (SELECT COUNT(*) FROM issue WHERE deleted_at IS NULL) as active_issues,
--     (SELECT COUNT(*) FROM issue WHERE deleted_at IS NOT NULL) as deleted_issues,
--     (SELECT COUNT(*) FROM copy WHERE deleted_at IS NULL) as active_copies;

-- 3. Find any remaining issues with duplicate copies
-- SELECT series_id, volume_id, issue_number, COUNT(*) as cnt
-- FROM issue
-- WHERE deleted_at IS NULL
-- GROUP BY series_id, volume_id, issue_number
-- HAVING COUNT(*) > 1;

-- ============================================================================
-- ROLLBACK INSTRUCTIONS (if needed)
-- ============================================================================
-- If something goes wrong, you can rollback within the transaction.
-- After commit, to undo:
--
-- 1. Restore deleted issues:
-- UPDATE issue SET deleted_at = NULL WHERE deleted_at > '[migration_timestamp]';
--
-- 2. Move copies back (requires the consolidation map):
-- You would need to recreate the map and reverse the copy movements
--
-- It's recommended to backup the database before running this migration.

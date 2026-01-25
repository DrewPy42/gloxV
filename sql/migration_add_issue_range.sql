-- Migration: Add issue_range to volume table
-- Date: 2025-01-25
-- Purpose: Support non-contiguous issue numbering (e.g., Fantastic Four v1: 1-416, 500+)

-- Add issue_range column to volume table
-- Format examples:
--   "1-416" - simple range
--   "1-416, 500+" - non-contiguous with open-ended
--   "1-5, 7, 10-15" - with gaps and single issues
ALTER TABLE `volume`
ADD COLUMN `issue_range` VARCHAR(255) DEFAULT NULL
AFTER `volume_number`;

-- Migrate existing data: convert start_issue/end_issue to issue_range format
UPDATE `volume`
SET `issue_range` = CASE
    WHEN `start_issue` IS NOT NULL AND `end_issue` IS NOT NULL THEN
        CONCAT(`start_issue`, '-', `end_issue`)
    WHEN `start_issue` IS NOT NULL AND `end_issue` IS NULL THEN
        CONCAT(`start_issue`, '+')
    WHEN `start_issue` IS NULL AND `end_issue` IS NOT NULL THEN
        CONCAT('1-', `end_issue`)
    ELSE NULL
END
WHERE `issue_range` IS NULL
  AND (`start_issue` IS NOT NULL OR `end_issue` IS NOT NULL);

-- Update the v_missing_issues view to use issue_range
-- Note: MySQL views can't use stored functions for complex parsing,
-- so the actual missing issue calculation will be done in application code.
-- This view now includes issue_range for the application to process.
DROP VIEW IF EXISTS `v_missing_issues`;
CREATE VIEW `v_missing_issues` AS
SELECT
  v.volume_id,
  v.series_id,
  s.title AS series_title,
  v.volume_number,
  v.issue_range,
  v.start_issue,
  v.end_issue,
  GROUP_CONCAT(DISTINCT i.issue_number ORDER BY i.sort_order) AS owned_issues,
  GROUP_CONCAT(DISTINCT i.issue_number_numeric ORDER BY i.issue_number_numeric) AS owned_issue_numbers
FROM volume v
JOIN series s ON v.series_id = s.series_id
LEFT JOIN issue i ON v.volume_id = i.volume_id AND i.deleted_at IS NULL
LEFT JOIN copy c ON i.issue_id = c.issue_id AND c.deleted_at IS NULL
WHERE v.deleted_at IS NULL
GROUP BY v.volume_id, v.series_id, s.title, v.volume_number, v.issue_range, v.start_issue, v.end_issue;

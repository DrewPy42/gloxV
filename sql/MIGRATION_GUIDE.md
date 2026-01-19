# Cover System Migration Guide

This guide walks through migrating the Goldilox cover system from issue-based to copy-based, and consolidating duplicate issue records.

## Overview

### Problem
- Cover images are stored in `issue.notes` field as filenames
- Multiple issue records exist for the same issue with different covers (e.g., 5 X-Men #1 records)
- The `cover` table is currently linked to issues, not copies

### Solution
- **Phase 1**: Migrate covers to be copy-based (attach to specific copies)
- **Phase 2**: Consolidate duplicate issues into single issue records with multiple copies

### Impact
- **Before**: 6,732 issues, 7,492 copies, 0 cover records, 44 duplicate groups
- **After**: 6,677 issues (-55), 7,492 copies (same), ~7,400 cover records, 0 duplicates

## Prerequisites

### 1. Backup Database
```bash
# Create backup before migration
docker-compose exec mysql mysqldump -u root -p glox > backup_before_cover_migration_$(date +%Y%m%d_%H%M%S).sql
```

### 2. Verify Current State
```bash
# Check counts before migration
docker-compose exec mysql mysql -u root -p glox -e "
SELECT
  (SELECT COUNT(*) FROM issue WHERE notes LIKE '%Cover file:%') as issues_with_covers,
  (SELECT COUNT(*) FROM issue WHERE deleted_at IS NULL) as active_issues,
  (SELECT COUNT(*) FROM cover) as existing_covers,
  (SELECT COUNT(*) FROM copy WHERE deleted_at IS NULL) as active_copies;
"
```

Expected output:
- issues_with_covers: 4,639
- active_issues: 6,732
- existing_covers: 0
- active_copies: 7,492

### 3. Upload Cover Images
Before running migrations, ensure cover image files are uploaded to:
```
client/public/images/covers/
```

The filenames should match the UUIDs stored in issue.notes (e.g., `bb39e68e-4ba4-4725-bf5b-03a8c239683b.jpg`)

## Phase 1: Migrate Cover System (Issue → Copy)

### What This Does
1. Adds `copy_id` column to `cover` table
2. Extracts cover filenames from `issue.notes`
3. Creates cover records for each copy
4. Links copies to their covers via `copy.cover_id`

### Execute Phase 1
```bash
# Run Phase 1 migration
docker-compose exec mysql mysql -u root -p glox < sql/migration_phase1_cover_to_copy.sql
```

### Verify Phase 1
```bash
# Check that covers were created
docker-compose exec mysql mysql -u root -p glox -e "
SELECT
    'Cover records created' as metric,
    COUNT(*) as count
FROM cover
WHERE copy_id IS NOT NULL
UNION ALL
SELECT
    'Copies with covers' as metric,
    COUNT(*) as count
FROM copy
WHERE cover_id IS NOT NULL;
"
```

Expected: ~7,400 cover records created, ~7,400 copies with covers

### Check Specific Example (X-Men #1)
```bash
docker-compose exec mysql mysql -u root -p glox -e "
SELECT
    i.issue_id,
    i.issue_number,
    c.copy_id,
    cov.cover_id,
    cov.cover_image_path,
    cov.notes as cover_notes
FROM issue i
JOIN copy c ON i.issue_id = c.issue_id
LEFT JOIN cover cov ON c.cover_id = cov.cover_id
WHERE i.series_id = 235 AND i.issue_number = '1'
  AND i.deleted_at IS NULL
ORDER BY i.issue_id, c.copy_id;
"
```

Should show 5 issues (1102, 9892-9895) with 13 copies, each copy linked to a cover.

### Complete Phase 1 (Drop Old Columns)
After verifying Phase 1 is successful, uncomment and run these steps in the migration script:

```sql
-- Drop old issue_id column from cover table
ALTER TABLE cover DROP FOREIGN KEY cover_ibfk_1;
ALTER TABLE cover DROP COLUMN issue_id;

-- Add foreign key for copy_id
ALTER TABLE cover
ADD CONSTRAINT fk_cover_copy
FOREIGN KEY (copy_id) REFERENCES copy(copy_id) ON DELETE CASCADE;

-- Make copy_id required
ALTER TABLE cover MODIFY copy_id INT NOT NULL;
```

## Phase 2: Consolidate Duplicate Issues

### What This Does
1. Identifies 44 duplicate issue groups (same series/volume/issue_number)
2. Selects canonical issue (lowest issue_id) for each group
3. Moves all copies from duplicates to canonical issue
4. Moves all related data (credits, storylines, tags, etc.)
5. Soft-deletes 55 duplicate issue records

### Execute Phase 2
```bash
# Run Phase 2 migration
docker-compose exec mysql mysql -u root -p glox < sql/migration_phase2_consolidate_duplicates.sql
```

### Verify Phase 2
```bash
# Check consolidation results
docker-compose exec mysql mysql -u root -p glox -e "
SELECT
    'Active issues' as metric,
    COUNT(*) as count
FROM issue
WHERE deleted_at IS NULL
UNION ALL
SELECT
    'Deleted issues (duplicates)' as metric,
    COUNT(*) as count
FROM issue
WHERE deleted_at IS NOT NULL
UNION ALL
SELECT
    'Remaining duplicate groups (should be 0)' as metric,
    COUNT(*) as count
FROM (
    SELECT series_id, volume_id, issue_number
    FROM issue
    WHERE deleted_at IS NULL
    GROUP BY series_id, volume_id, issue_number
    HAVING COUNT(*) > 1
) as dupes;
"
```

Expected:
- Active issues: 6,677
- Deleted issues: 55
- Remaining duplicates: 0

### Check X-Men #1 Consolidation
```bash
docker-compose exec mysql mysql -u root -p glox -e "
SELECT
    i.issue_id,
    i.issue_number,
    CASE WHEN i.deleted_at IS NULL THEN 'Active' ELSE 'Deleted' END as status,
    COUNT(c.copy_id) as copy_count
FROM issue i
LEFT JOIN copy c ON i.issue_id = c.issue_id AND c.deleted_at IS NULL
WHERE i.series_id = 235 AND i.issue_number = '1'
GROUP BY i.issue_id, i.deleted_at
ORDER BY i.deleted_at IS NULL DESC, i.issue_id;
"
```

Expected:
- 1 active issue (1102) with 13 copies
- 4 deleted issues (9892-9895) with 0 copies

## Post-Migration Tasks

### 1. Update API Endpoints
The following API changes are needed:

**server/src/routes/covers.ts:**
- Change queries to join on `copy_id` instead of `issue_id`
- Update filter to support `?copy_id=X` instead of `?issue_id=X`

**server/src/routes/copies.ts:**
- Update GET `/api/copies/:id` to include cover data
- Add endpoint GET `/api/copies/:id/cover` to fetch cover for a copy

### 2. Update Frontend Components
The following frontend changes are needed:

**Components to Update:**
- `components/forms/CopyForm.vue` - Add cover selection/upload
- `components/pages/IssuePage.vue` - Show covers per copy, not per issue
- `components/objects/CoverImage.vue` - Update to fetch via copy_id

**Stores to Update:**
- `core/stores/coverStore.ts` - Update fetchCovers to filter by copy_id
- `core/stores/copyStore.ts` - Add cover relationship loading

### 3. Clean Up Issue Notes
After verifying everything works, you can optionally clean up the old cover references from issue.notes:

```sql
-- Remove "Cover file:" lines from issue.notes
UPDATE issue
SET notes = TRIM(BOTH '\n' FROM REPLACE(notes, CONCAT('Cover file: ', SUBSTRING_INDEX(SUBSTRING_INDEX(notes, 'Cover file: ', -1), '\n', 1), '\n'), ''))
WHERE notes LIKE '%Cover file:%';

-- Remove "Cover info:" lines (now in cover.notes)
UPDATE issue
SET notes = TRIM(BOTH '\n' FROM REPLACE(notes, CONCAT('Cover info: ', SUBSTRING_INDEX(SUBSTRING_INDEX(notes, 'Cover info: ', -1), '\n', 1), '\n'), ''))
WHERE notes LIKE '%Cover info:%';
```

## Rollback Instructions

### If Phase 1 Fails
```sql
-- Within transaction (before COMMIT)
ROLLBACK;

-- After commit
ALTER TABLE cover DROP COLUMN copy_id;
UPDATE copy SET cover_id = NULL;
DELETE FROM cover WHERE copy_id IS NOT NULL;
```

### If Phase 2 Fails
```sql
-- Within transaction (before COMMIT)
ROLLBACK;

-- After commit (requires timestamp of migration)
UPDATE issue
SET deleted_at = NULL
WHERE deleted_at > '[migration_timestamp]';

-- Note: Moving copies back requires recreating the consolidation map
-- It's recommended to restore from backup if Phase 2 needs rollback
```

## Testing Checklist

After both migrations:

- [ ] Cover images display correctly in the UI
- [ ] Each copy shows its specific cover variant
- [ ] X-Men #1 shows as 1 issue with 13 copies (not 5 issues)
- [ ] All 7,492 copies still exist and are accessible
- [ ] Issue counts per series are correct (6,677 total)
- [ ] Credits and storylines are preserved on canonical issues
- [ ] No duplicate issues remain in the database

## Support

If you encounter issues:
1. Check verification queries in each migration script
2. Review the backup before attempting rollback
3. Check application logs for API errors
4. Verify file permissions on cover image directory

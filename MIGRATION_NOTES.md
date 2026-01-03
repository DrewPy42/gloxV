# Database Column Renaming - Migration Notes

**Date:** 2026-01-03
**Issue:** MySQL reserved keywords `name` and `row_number` were causing syntax errors

## Changes Made

### Database Schema Changes

The following columns were renamed to avoid MySQL reserved keywords:

1. **`storyline` table:**
   - `name` → `storyline_name`

2. **`location` table:**
   - `name` → `location_name`
   - `row_number` → `row_num`

### Migration File

Created: `sql/migration_rename_reserved_columns.sql`

This migration was successfully executed on the database to rename the columns.

### Code Changes

#### Server-side (TypeScript/Express)

1. **Type Definitions** (`server/src/types/models.ts`):
   - Updated `Location` interface: `name` → `location_name`, `row_number` → `row_num`
   - Updated `Storyline` interface: `name` → `storyline_name`

2. **Route Files:**
   - `server/src/routes/locations.ts`: Updated all SQL queries and request body parsing
   - `server/src/routes/storylines.ts`: Updated all SQL queries and request body parsing
   - `server/src/routes/tags.ts`: Updated subquery referencing storyline name

#### Client-side (Vue/TypeScript)

1. **Models** (`client/src/core/models/index.ts`):
   - Updated `Location` interface: `name` → `location_name`, `row_number` → `row_num`
   - Updated `Storyline` interface: `name` → `storyline_name`

### Schema File Updates

Updated `sql/comic_schema_v2.sql` to reflect the new column names for future reference.

## Testing

Both API endpoints were tested and are functioning correctly:

- ✅ `GET /api/locations` - Returns `location_name` and `row_num`
- ✅ `GET /api/storylines` - Returns `storyline_name`

## Benefits

- **No more backticks needed:** Column names are now standard identifiers
- **Better maintainability:** Avoids potential conflicts with MySQL reserved words
- **Clearer naming:** `location_name` and `storyline_name` are more descriptive
- **Future-proof:** Prevents similar issues as MySQL adds more reserved keywords

## Breaking Changes

Any existing client code or API consumers will need to update field names:

- `location.name` → `location.location_name`
- `location.row_number` → `location.row_num`
- `storyline.name` → `storyline.storyline_name`

## Files Modified

### SQL
- `sql/migration_rename_reserved_columns.sql` (created)
- `sql/comic_schema_v2.sql` (updated)

### Server
- `server/src/types/models.ts`
- `server/src/routes/locations.ts`
- `server/src/routes/storylines.ts`
- `server/src/routes/tags.ts`

### Client
- `client/src/core/models/index.ts`

## Rollback (if needed)

To rollback these changes, run:

```sql
ALTER TABLE `storyline`
  CHANGE COLUMN `storyline_name` `name` VARCHAR(150) NOT NULL;

ALTER TABLE `location`
  CHANGE COLUMN `location_name` `name` VARCHAR(100) DEFAULT NULL;

ALTER TABLE `location`
  CHANGE COLUMN `row_num` `row_number` INT DEFAULT NULL;
```

Then revert the code changes in the files listed above.

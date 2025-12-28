# Comic Book Database Migration

## Overview

These scripts migrate data from the legacy `goldilox` database to the new `glox` database schema.

## Prerequisites

1. **Backup your data first!**
   ```bash
   mysqldump -u [user] -p goldilox > goldilox_backup_$(date +%Y%m%d).sql
   ```

2. **Create the new database:**
   ```sql
   CREATE DATABASE glox CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
   ```

3. **Run the v2 schema against glox:**
   ```bash
   mysql -u [user] -p glox < comic_schema_v2.sql
   ```

## Migration Phases

Run each script in order. Review the validation output before proceeding to the next phase.

| Phase | Script | Description |
|-------|--------|-------------|
| 1 | `01_setup_and_lookups.sql` | Lookup tables: comic_age, condition_code, job_title, publisher, person |
| 2 | `02_locations.sql` | Parse location strings, create location records |
| 3 | `03_series_and_volumes.sql` | Series and volume data, series links |
| 4 | `04_issues.sql` | Issues with sort_order calculation, default covers |
| 5 | `05_copies.sql` | Copy records |
| 6 | `06_credits.sql` | Issue credits |
| 7 | `07_final_validation.sql` | Comprehensive validation |

## Running the Scripts

```bash
# Run each phase
mysql -u [user] -p < 01_setup_and_lookups.sql
mysql -u [user] -p < 02_locations.sql
mysql -u [user] -p < 03_series_and_volumes.sql
mysql -u [user] -p < 04_issues.sql
mysql -u [user] -p < 05_copies.sql
mysql -u [user] -p < 06_credits.sql
mysql -u [user] -p < 07_final_validation.sql
```

Or run interactively in MySQL Workbench to review results step-by-step.

## What Gets Migrated

| Source Table | Target Table | Notes |
|--------------|--------------|-------|
| comic_age | comic_age | Direct copy |
| condition_code | condition_code | Added sort_order |
| job_title | job_title | Added job_category link |
| publisher | publisher | Renamed columns |
| person | person | Added timestamps |
| series_title | series | Dropped denormalized counts, linked to location |
| series_volume | volume | Parsed issue_range where possible |
| series_issue | issue + cover | Split cover data, added sort_order |
| series_copy | copy | Renamed columns |
| issue_credit | issue_credit | Direct copy |

## New Tables (Empty After Migration)

These tables are ready for you to populate:

- `collected_edition` / `collected_edition_issue` - TPBs, omnibuses, digital bundles
- `storyline` / `storyline_issue` - Crossover and event tracking
- `tag` / `taggable` - Flexible tagging system
- `person_alias` - Creator alternate names
- `value_history` - Value tracking over time

## Post-Migration Tasks

1. **Review crossover data** - Phase 4 outputs a list of crossovers found. Use this to create storyline records.

2. **Update special copies** - Run the query in Phase 5 that identifies potential slabs/signed copies, update their format field.

3. **Verify locations** - During inventory, update location records with actual cabinet/drawer numbers.

4. **Set up value tracking** - Consider adding current values to value_history before your next valuation update.

## Rollback

If something goes wrong:

```sql
DROP DATABASE glox;
-- Restore from backup if needed
mysql -u [user] -p goldilox < goldilox_backup_YYYYMMDD.sql
```

The original `goldilox` database is never modified by these scripts.

## Questions?

The migration preserves all your data while restructuring it into the new normalized schema. 
Review the validation output at each phase - all counts should match.

-- Migration: Rename reserved column names to avoid MySQL conflicts
-- Date: 2026-01-03
-- Changes:
--   1. storyline.name -> storyline.storyline_name
--   2. location.name -> location.location_name
--   3. location.row_number -> location.row_num

-- Rename storyline.name to storyline.storyline_name
ALTER TABLE `storyline`
  CHANGE COLUMN `name` `storyline_name` VARCHAR(150) NOT NULL;

-- Rename location.name to location.location_name
ALTER TABLE `location`
  CHANGE COLUMN `name` `location_name` VARCHAR(100) DEFAULT NULL;

-- Rename location.row_number to location.row_num
ALTER TABLE `location`
  CHANGE COLUMN `row_number` `row_num` INT DEFAULT NULL;

-- Update the base schema file is recommended after running this migration

-- Phase 1: Location Hierarchy Foundation
-- Adds parent_location_id (self-join), expands StorageType enum,
-- and creates the location_link table for continuation/overflow relationships.

-- ----------------------------------------------------------------------------
-- Step 1: Expand the storage_type enum
-- New values: drawer, shelf, box, folder
-- ----------------------------------------------------------------------------
ALTER TABLE `location`
  MODIFY COLUMN `storage_type`
    ENUM('cabinet', 'drawer', 'divider', 'bookshelf', 'shelf', 'display', 'box', 'folder', 'digital')
    NOT NULL;

-- ----------------------------------------------------------------------------
-- Step 2: Add parent_location_id to location
-- NULL means root location (no parent).
-- Self-referencing FK is deferred so existing rows don't need a parent.
-- ----------------------------------------------------------------------------
ALTER TABLE `location`
  ADD COLUMN `parent_location_id` INT DEFAULT NULL AFTER `location_id`,
  ADD CONSTRAINT `fk_location_parent`
    FOREIGN KEY (`parent_location_id`)
    REFERENCES `location` (`location_id`)
    ON DELETE RESTRICT;

-- Index to make parent→children lookups fast
CREATE INDEX `idx_location_parent` ON `location` (`parent_location_id`);

-- ----------------------------------------------------------------------------
-- Step 3: Create location_link table for continuation/overflow
-- Represents "Divider A in Drawer 1 continues into Divider A in Drawer 2".
-- This is NOT physical containment — stored separately from parent_location_id.
-- ----------------------------------------------------------------------------
CREATE TABLE `location_link` (
  `location_link_id` INT NOT NULL AUTO_INCREMENT,
  `from_location_id` INT NOT NULL,
  `to_location_id`   INT NOT NULL,
  `notes`            TEXT DEFAULT NULL,
  `created_at`       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`location_link_id`),
  UNIQUE KEY `uq_location_link` (`from_location_id`, `to_location_id`),
  CONSTRAINT `fk_link_from` FOREIGN KEY (`from_location_id`)
    REFERENCES `location` (`location_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_link_to`   FOREIGN KEY (`to_location_id`)
    REFERENCES `location` (`location_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

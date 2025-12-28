-- Comic Book Collection Database Schema v2
-- Updated: 2025-12-27
-- Changes from v1:
--   - Removed denormalized count/value fields (compute on demand)
--   - Added soft delete support (deleted_at)
--   - Added CollectedEdition for TPBs, omnibuses, digital bundles
--   - Added polymorphic Location system
--   - Added flexible Tag system
--   - Added Storyline/Event for crossover tracking
--   - Added proper foreign key constraints
--   - Removed duplicate volume_number from series_issue

SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================================
-- LOOKUP TABLES
-- ============================================================================

DROP TABLE IF EXISTS `comic_age`;
CREATE TABLE `comic_age` (
  `comic_age_id` INT NOT NULL AUTO_INCREMENT,
  `comic_age` VARCHAR(45) NOT NULL,
  `start_year` INT DEFAULT NULL,
  `end_year` INT DEFAULT NULL,
  PRIMARY KEY (`comic_age_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `condition_code`;
CREATE TABLE `condition_code` (
  `condition_id` INT NOT NULL AUTO_INCREMENT,
  `condition_code` VARCHAR(10) NOT NULL,
  `condition_text` VARCHAR(45) NOT NULL,
  `condition_points` DECIMAL(4,2) DEFAULT NULL,
  `sort_order` INT DEFAULT NULL,
  PRIMARY KEY (`condition_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `job_category`;
CREATE TABLE `job_category` (
  `job_category_id` INT NOT NULL AUTO_INCREMENT,
  `category_name` VARCHAR(45) NOT NULL,
  PRIMARY KEY (`job_category_id`),
  UNIQUE KEY `uk_category_name` (`category_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `job_title`;
CREATE TABLE `job_title` (
  `job_title_id` INT NOT NULL AUTO_INCREMENT,
  `job_title` VARCHAR(45) NOT NULL,
  `job_category_id` INT DEFAULT NULL,
  PRIMARY KEY (`job_title_id`),
  INDEX `idx_job_category` (`job_category_id`),
  CONSTRAINT `fk_job_category` FOREIGN KEY (`job_category_id`)
    REFERENCES `job_category` (`job_category_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ============================================================================
-- CORE ENTITIES
-- ============================================================================

DROP TABLE IF EXISTS `publisher`;
CREATE TABLE `publisher` (
  `publisher_id` INT NOT NULL AUTO_INCREMENT,
  `publisher_name` VARCHAR(100) NOT NULL,
  `logo_path` VARCHAR(255) DEFAULT NULL,
  `website` VARCHAR(255) DEFAULT NULL,
  `notes` TEXT,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` DATETIME DEFAULT NULL,
  PRIMARY KEY (`publisher_id`),
  INDEX `idx_publisher_name` (`publisher_name`),
  INDEX `idx_publisher_deleted` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `person`;
CREATE TABLE `person` (
  `person_id` INT NOT NULL AUTO_INCREMENT,
  `first_name` VARCHAR(45) DEFAULT NULL,
  `last_name` VARCHAR(45) NOT NULL,
  `biography` TEXT,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` DATETIME DEFAULT NULL,
  PRIMARY KEY (`person_id`),
  INDEX `idx_person_name` (`last_name`, `first_name`),
  INDEX `idx_person_deleted` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Aliases for creators who go by different names
DROP TABLE IF EXISTS `person_alias`;
CREATE TABLE `person_alias` (
  `person_alias_id` INT NOT NULL AUTO_INCREMENT,
  `person_id` INT NOT NULL,
  `alias_name` VARCHAR(100) NOT NULL,
  `alias_type` ENUM('pen_name', 'maiden_name', 'nickname', 'alternate_spelling', 'other') DEFAULT 'other',
  `notes` VARCHAR(255) DEFAULT NULL,
  PRIMARY KEY (`person_alias_id`),
  INDEX `idx_alias_person` (`person_id`),
  INDEX `idx_alias_name` (`alias_name`),
  CONSTRAINT `fk_alias_person` FOREIGN KEY (`person_id`)
    REFERENCES `person` (`person_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ============================================================================
-- LOCATION SYSTEM (Polymorphic)
-- ============================================================================

DROP TABLE IF EXISTS `location`;
CREATE TABLE `location` (
  `location_id` INT NOT NULL AUTO_INCREMENT,
  `storage_type` ENUM('cabinet', 'display', 'bookshelf', 'digital') NOT NULL,
  `name` VARCHAR(100) DEFAULT NULL,
  -- Cabinet-specific fields
  `cabinet_number` INT DEFAULT NULL,
  `drawer_number` INT DEFAULT NULL,
  `divider` VARCHAR(50) DEFAULT NULL,
  `row_number` INT DEFAULT NULL,
  -- Bookshelf/display fields
  `shelf_description` VARCHAR(255) DEFAULT NULL,
  -- Digital-specific fields
  `file_path` VARCHAR(500) DEFAULT NULL,
  `backup_path` VARCHAR(500) DEFAULT NULL,
  -- Common fields
  `notes` TEXT,
  `is_insured_separately` TINYINT(1) DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` DATETIME DEFAULT NULL,
  PRIMARY KEY (`location_id`),
  INDEX `idx_location_type` (`storage_type`),
  INDEX `idx_location_cabinet` (`cabinet_number`, `drawer_number`, `divider`),
  INDEX `idx_location_deleted` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ============================================================================
-- SERIES HIERARCHY
-- ============================================================================

DROP TABLE IF EXISTS `series`;
CREATE TABLE `series` (
  `series_id` INT NOT NULL AUTO_INCREMENT,
  `title` VARCHAR(150) NOT NULL,
  `sort_title` VARCHAR(150) DEFAULT NULL,
  `issn` VARCHAR(15) DEFAULT NULL,
  `publisher_id` INT DEFAULT NULL,
  `comic_age_id` INT DEFAULT NULL,
  `is_limited_series` TINYINT(1) NOT NULL DEFAULT 0,
  `limited_series_count` INT DEFAULT NULL,
  `notes` TEXT,
  `default_location_id` INT DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` DATETIME DEFAULT NULL,
  PRIMARY KEY (`series_id`),
  INDEX `idx_series_title` (`title`),
  INDEX `idx_series_sort` (`sort_title`),
  INDEX `idx_series_publisher` (`publisher_id`),
  INDEX `idx_series_deleted` (`deleted_at`),
  CONSTRAINT `fk_series_publisher` FOREIGN KEY (`publisher_id`) 
    REFERENCES `publisher` (`publisher_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_series_comic_age` FOREIGN KEY (`comic_age_id`) 
    REFERENCES `comic_age` (`comic_age_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_series_location` FOREIGN KEY (`default_location_id`) 
    REFERENCES `location` (`location_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Links between series (for connected limited series, spin-offs, etc.)
DROP TABLE IF EXISTS `series_link`;
CREATE TABLE `series_link` (
  `series_link_id` INT NOT NULL AUTO_INCREMENT,
  `from_series_id` INT NOT NULL,
  `to_series_id` INT NOT NULL,
  `link_type` ENUM('continues_story', 'spin_off', 'related') NOT NULL,
  `notes` VARCHAR(255) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`series_link_id`),
  UNIQUE KEY `uk_series_link` (`from_series_id`, `to_series_id`, `link_type`),
  INDEX `idx_sl_to` (`to_series_id`),
  CONSTRAINT `fk_sl_from` FOREIGN KEY (`from_series_id`) REFERENCES `series` (`series_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_sl_to` FOREIGN KEY (`to_series_id`) REFERENCES `series` (`series_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `volume`;
CREATE TABLE `volume` (
  `volume_id` INT NOT NULL AUTO_INCREMENT,
  `series_id` INT NOT NULL,
  `volume_number` INT NOT NULL,
  `start_issue` INT DEFAULT NULL,
  `end_issue` INT DEFAULT NULL,
  `start_date` DATE DEFAULT NULL,
  `end_date` DATE DEFAULT NULL,
  `notes` TEXT,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` DATETIME DEFAULT NULL,
  PRIMARY KEY (`volume_id`),
  INDEX `idx_volume_series` (`series_id`, `volume_number`),
  INDEX `idx_volume_deleted` (`deleted_at`),
  CONSTRAINT `fk_volume_series` FOREIGN KEY (`series_id`) 
    REFERENCES `series` (`series_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `issue`;
CREATE TABLE `issue` (
  `issue_id` INT NOT NULL AUTO_INCREMENT,
  `series_id` INT NOT NULL,
  `volume_id` INT DEFAULT NULL,
  -- Hybrid issue numbering system
  `issue_number` VARCHAR(10) NOT NULL,  -- Display value: "1", "1/2", "-1", "1A"
  `issue_number_numeric` INT DEFAULT NULL,  -- Numeric portion for filtering/math, NULL for non-numeric
  `sort_order` INT NOT NULL,  -- Sortable value (auto-calculated or manual override)
  `issue_title` VARCHAR(150) DEFAULT NULL,
  `title_variant` VARCHAR(150) DEFAULT NULL,  -- When cover title differs from series title
  `cover_date` DATE DEFAULT NULL,
  `release_date` DATE DEFAULT NULL,
  `cover_price` DECIMAL(10,2) DEFAULT NULL,
  `page_count` INT DEFAULT NULL,
  `notes` TEXT,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` DATETIME DEFAULT NULL,
  PRIMARY KEY (`issue_id`),
  INDEX `idx_issue_series_sort` (`series_id`, `sort_order`),
  INDEX `idx_issue_series_number` (`series_id`, `issue_number`),
  INDEX `idx_issue_volume` (`volume_id`),
  INDEX `idx_issue_date` (`cover_date`),
  INDEX `idx_issue_numeric` (`issue_number_numeric`),
  INDEX `idx_issue_deleted` (`deleted_at`),
  CONSTRAINT `fk_issue_series` FOREIGN KEY (`series_id`) 
    REFERENCES `series` (`series_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_issue_volume` FOREIGN KEY (`volume_id`) 
    REFERENCES `volume` (`volume_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ============================================================================
-- COVER VARIANTS (Separated from Issue)
-- ============================================================================

DROP TABLE IF EXISTS `cover`;
CREATE TABLE `cover` (
  `cover_id` INT NOT NULL AUTO_INCREMENT,
  `issue_id` INT NOT NULL,
  `cover_type` ENUM('standard', 'variant', 'incentive', 'sketch', 'virgin', 'foil', 'other') NOT NULL DEFAULT 'standard',
  `cover_description` VARCHAR(255) DEFAULT NULL,
  `cover_artist_person_id` INT DEFAULT NULL,
  `cover_image_path` VARCHAR(255) DEFAULT NULL,
  `is_primary` TINYINT(1) NOT NULL DEFAULT 0,
  `notes` TEXT,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` DATETIME DEFAULT NULL,
  PRIMARY KEY (`cover_id`),
  INDEX `idx_cover_issue` (`issue_id`),
  INDEX `idx_cover_deleted` (`deleted_at`),
  CONSTRAINT `fk_cover_issue` FOREIGN KEY (`issue_id`) 
    REFERENCES `issue` (`issue_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_cover_artist` FOREIGN KEY (`cover_artist_person_id`) 
    REFERENCES `person` (`person_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ============================================================================
-- COPY (Physical single issues)
-- ============================================================================

DROP TABLE IF EXISTS `copy`;
CREATE TABLE `copy` (
  `copy_id` INT NOT NULL AUTO_INCREMENT,
  `issue_id` INT NOT NULL,
  `cover_id` INT DEFAULT NULL,  -- Which cover variant this copy has
  `condition_id` INT DEFAULT NULL,
  `format` ENUM('floppy', 'digital', 'cgc_slab', 'cbcs_slab', 'other') NOT NULL DEFAULT 'floppy',
  `purchase_price` DECIMAL(10,2) DEFAULT NULL,
  `current_value` DECIMAL(10,2) DEFAULT NULL,
  `value_date` DATE DEFAULT NULL,  -- When the current_value was assessed
  `purchase_date` DATE DEFAULT NULL,
  `purchase_source` VARCHAR(255) DEFAULT NULL,
  `location_id` INT DEFAULT NULL,  -- Override series default location
  -- For slabbed copies
  `grade` DECIMAL(3,1) DEFAULT NULL,
  `certification_number` VARCHAR(50) DEFAULT NULL,
  -- Digital-specific
  `file_path` VARCHAR(500) DEFAULT NULL,
  `notes` TEXT,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` DATETIME DEFAULT NULL,
  PRIMARY KEY (`copy_id`),
  INDEX `idx_copy_issue` (`issue_id`),
  INDEX `idx_copy_condition` (`condition_id`),
  INDEX `idx_copy_location` (`location_id`),
  INDEX `idx_copy_deleted` (`deleted_at`),
  CONSTRAINT `fk_copy_issue` FOREIGN KEY (`issue_id`) 
    REFERENCES `issue` (`issue_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_copy_cover` FOREIGN KEY (`cover_id`) 
    REFERENCES `cover` (`cover_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_copy_condition` FOREIGN KEY (`condition_id`) 
    REFERENCES `condition_code` (`condition_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_copy_location` FOREIGN KEY (`location_id`) 
    REFERENCES `location` (`location_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ============================================================================
-- COLLECTED EDITIONS (TPBs, Omnibuses, Digital Bundles, etc.)
-- ============================================================================

DROP TABLE IF EXISTS `collected_edition`;
CREATE TABLE `collected_edition` (
  `collected_edition_id` INT NOT NULL AUTO_INCREMENT,
  `title` VARCHAR(255) NOT NULL,
  `publisher_id` INT DEFAULT NULL,
  `format` ENUM('tpb', 'hardcover', 'omnibus', 'absolute', 'digital_bundle', 'manga_tankobon', 'other') NOT NULL,
  `isbn` VARCHAR(20) DEFAULT NULL,
  `page_count` INT DEFAULT NULL,
  `cover_price` DECIMAL(10,2) DEFAULT NULL,
  `release_date` DATE DEFAULT NULL,
  `cover_image_path` VARCHAR(255) DEFAULT NULL,
  `condition_id` INT DEFAULT NULL,
  `purchase_price` DECIMAL(10,2) DEFAULT NULL,
  `current_value` DECIMAL(10,2) DEFAULT NULL,
  `value_date` DATE DEFAULT NULL,
  `purchase_date` DATE DEFAULT NULL,
  `purchase_source` VARCHAR(255) DEFAULT NULL,
  `location_id` INT DEFAULT NULL,
  -- Digital-specific
  `file_path` VARCHAR(500) DEFAULT NULL,
  `backup_path` VARCHAR(500) DEFAULT NULL,
  `notes` TEXT,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` DATETIME DEFAULT NULL,
  PRIMARY KEY (`collected_edition_id`),
  INDEX `idx_ce_title` (`title`),
  INDEX `idx_ce_publisher` (`publisher_id`),
  INDEX `idx_ce_format` (`format`),
  INDEX `idx_ce_location` (`location_id`),
  INDEX `idx_ce_deleted` (`deleted_at`),
  CONSTRAINT `fk_ce_publisher` FOREIGN KEY (`publisher_id`) 
    REFERENCES `publisher` (`publisher_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_ce_condition` FOREIGN KEY (`condition_id`) 
    REFERENCES `condition_code` (`condition_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_ce_location` FOREIGN KEY (`location_id`) 
    REFERENCES `location` (`location_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Junction table: which issues are in which collected edition
DROP TABLE IF EXISTS `collected_edition_issue`;
CREATE TABLE `collected_edition_issue` (
  `collected_edition_issue_id` INT NOT NULL AUTO_INCREMENT,
  `collected_edition_id` INT NOT NULL,
  `issue_id` INT NOT NULL,
  `sequence_order` INT DEFAULT NULL,  -- Order within the collected edition
  `page_start` INT DEFAULT NULL,
  `page_end` INT DEFAULT NULL,
  `notes` VARCHAR(255) DEFAULT NULL,  -- e.g., "recolored", "alternate ending"
  PRIMARY KEY (`collected_edition_issue_id`),
  UNIQUE KEY `uk_ce_issue` (`collected_edition_id`, `issue_id`),
  INDEX `idx_cei_issue` (`issue_id`),
  CONSTRAINT `fk_cei_collected_edition` FOREIGN KEY (`collected_edition_id`) 
    REFERENCES `collected_edition` (`collected_edition_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_cei_issue` FOREIGN KEY (`issue_id`) 
    REFERENCES `issue` (`issue_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ============================================================================
-- CREDITS
-- ============================================================================

DROP TABLE IF EXISTS `issue_credit`;
CREATE TABLE `issue_credit` (
  `issue_credit_id` INT NOT NULL AUTO_INCREMENT,
  `issue_id` INT NOT NULL,
  `person_id` INT NOT NULL,
  `job_title_id` INT NOT NULL,
  `notes` VARCHAR(255) DEFAULT NULL,
  PRIMARY KEY (`issue_credit_id`),
  UNIQUE KEY `uk_issue_credit` (`issue_id`, `person_id`, `job_title_id`),
  INDEX `idx_credit_person` (`person_id`),
  INDEX `idx_credit_job` (`job_title_id`),
  CONSTRAINT `fk_credit_issue` FOREIGN KEY (`issue_id`) 
    REFERENCES `issue` (`issue_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_credit_person` FOREIGN KEY (`person_id`) 
    REFERENCES `person` (`person_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_credit_job` FOREIGN KEY (`job_title_id`) 
    REFERENCES `job_title` (`job_title_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ============================================================================
-- STORYLINES / EVENTS (Crossover tracking)
-- ============================================================================

DROP TABLE IF EXISTS `storyline`;
CREATE TABLE `storyline` (
  `storyline_id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(150) NOT NULL,
  `storyline_type` ENUM('crossover', 'event', 'arc', 'other') NOT NULL DEFAULT 'arc',
  `start_date` DATE DEFAULT NULL,
  `end_date` DATE DEFAULT NULL,
  `description` TEXT,
  `banner_image_path` VARCHAR(255) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` DATETIME DEFAULT NULL,
  PRIMARY KEY (`storyline_id`),
  INDEX `idx_storyline_name` (`name`),
  INDEX `idx_storyline_type` (`storyline_type`),
  INDEX `idx_storyline_deleted` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Junction table: which issues are part of which storyline
DROP TABLE IF EXISTS `storyline_issue`;
CREATE TABLE `storyline_issue` (
  `storyline_issue_id` INT NOT NULL AUTO_INCREMENT,
  `storyline_id` INT NOT NULL,
  `issue_id` INT NOT NULL,
  `part_number` INT DEFAULT NULL,  -- e.g., Part 3 of 12
  `part_label` VARCHAR(50) DEFAULT NULL,  -- e.g., "Prologue", "Epilogue"
  `reading_order` INT DEFAULT NULL,  -- Overall reading order across all series
  PRIMARY KEY (`storyline_issue_id`),
  UNIQUE KEY `uk_storyline_issue` (`storyline_id`, `issue_id`),
  INDEX `idx_si_issue` (`issue_id`),
  INDEX `idx_si_order` (`storyline_id`, `reading_order`),
  CONSTRAINT `fk_si_storyline` FOREIGN KEY (`storyline_id`) 
    REFERENCES `storyline` (`storyline_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_si_issue` FOREIGN KEY (`issue_id`) 
    REFERENCES `issue` (`issue_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ============================================================================
-- TAGGING SYSTEM
-- ============================================================================

DROP TABLE IF EXISTS `tag`;
CREATE TABLE `tag` (
  `tag_id` INT NOT NULL AUTO_INCREMENT,
  `tag_name` VARCHAR(100) NOT NULL,
  `tag_category` VARCHAR(50) DEFAULT NULL,  -- e.g., "character", "theme", "award"
  `color` VARCHAR(7) DEFAULT NULL,  -- Hex color for UI display
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`tag_id`),
  UNIQUE KEY `uk_tag_name` (`tag_name`),
  INDEX `idx_tag_category` (`tag_category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Polymorphic tagging - tags can be applied to multiple entity types
DROP TABLE IF EXISTS `taggable`;
CREATE TABLE `taggable` (
  `taggable_id` INT NOT NULL AUTO_INCREMENT,
  `tag_id` INT NOT NULL,
  `entity_type` ENUM('series', 'volume', 'issue', 'copy', 'collected_edition', 'person', 'storyline') NOT NULL,
  `entity_id` INT NOT NULL,
  PRIMARY KEY (`taggable_id`),
  UNIQUE KEY `uk_taggable` (`tag_id`, `entity_type`, `entity_id`),
  INDEX `idx_taggable_entity` (`entity_type`, `entity_id`),
  CONSTRAINT `fk_taggable_tag` FOREIGN KEY (`tag_id`) 
    REFERENCES `tag` (`tag_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ============================================================================
-- AUDIT HISTORY (Optional - for tracking value changes over time)
-- ============================================================================

DROP TABLE IF EXISTS `value_history`;
CREATE TABLE `value_history` (
  `value_history_id` INT NOT NULL AUTO_INCREMENT,
  `entity_type` ENUM('copy', 'collected_edition') NOT NULL,
  `entity_id` INT NOT NULL,
  `value` DECIMAL(10,2) NOT NULL,
  `value_source` VARCHAR(100) DEFAULT NULL,  -- e.g., "Overstreet", "eBay sold", "CovrPrice"
  `recorded_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `notes` VARCHAR(255) DEFAULT NULL,
  PRIMARY KEY (`value_history_id`),
  INDEX `idx_vh_entity` (`entity_type`, `entity_id`),
  INDEX `idx_vh_date` (`recorded_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ============================================================================
-- USEFUL VIEWS
-- ============================================================================

-- View: Get effective location for a copy (copy location or series default)
CREATE OR REPLACE VIEW `v_copy_location` AS
SELECT 
  c.copy_id,
  c.issue_id,
  COALESCE(c.location_id, s.default_location_id) AS effective_location_id,
  CASE WHEN c.location_id IS NOT NULL THEN 'copy' ELSE 'series' END AS location_source
FROM copy c
JOIN issue i ON c.issue_id = i.issue_id
JOIN series s ON i.series_id = s.series_id
WHERE c.deleted_at IS NULL;

-- View: Collection summary by series
CREATE OR REPLACE VIEW `v_series_summary` AS
SELECT 
  s.series_id,
  s.title,
  COUNT(DISTINCT i.issue_id) AS issue_count,
  COUNT(DISTINCT c.copy_id) AS copy_count,
  SUM(c.current_value) AS total_value,
  SUM(c.purchase_price) AS total_cost
FROM series s
LEFT JOIN issue i ON s.series_id = i.series_id AND i.deleted_at IS NULL
LEFT JOIN copy c ON i.issue_id = c.issue_id AND c.deleted_at IS NULL
WHERE s.deleted_at IS NULL
GROUP BY s.series_id, s.title;

-- View: Missing issues in a volume
CREATE OR REPLACE VIEW `v_missing_issues` AS
SELECT 
  v.volume_id,
  v.series_id,
  s.title AS series_title,
  v.volume_number,
  v.start_issue,
  v.end_issue,
  GROUP_CONCAT(DISTINCT i.issue_number ORDER BY CAST(i.issue_number AS UNSIGNED)) AS owned_issues
FROM volume v
JOIN series s ON v.series_id = s.series_id
LEFT JOIN issue i ON v.volume_id = i.volume_id AND i.deleted_at IS NULL
LEFT JOIN copy c ON i.issue_id = c.issue_id AND c.deleted_at IS NULL
WHERE v.deleted_at IS NULL
GROUP BY v.volume_id, v.series_id, s.title, v.volume_number, v.start_issue, v.end_issue;

-- View: Do I have this issue in any format?
CREATE OR REPLACE VIEW `v_issue_ownership` AS
SELECT 
  i.issue_id,
  s.title AS series_title,
  i.issue_number,
  COUNT(DISTINCT c.copy_id) AS copy_count,
  COUNT(DISTINCT cei.collected_edition_id) AS collected_edition_count,
  CASE 
    WHEN COUNT(c.copy_id) > 0 OR COUNT(cei.collected_edition_id) > 0 THEN 1 
    ELSE 0 
  END AS is_owned
FROM issue i
JOIN series s ON i.series_id = s.series_id
LEFT JOIN copy c ON i.issue_id = c.issue_id AND c.deleted_at IS NULL
LEFT JOIN collected_edition_issue cei ON i.issue_id = cei.issue_id
LEFT JOIN collected_edition ce ON cei.collected_edition_id = ce.collected_edition_id AND ce.deleted_at IS NULL
WHERE i.deleted_at IS NULL
GROUP BY i.issue_id, s.title, i.issue_number;

SET FOREIGN_KEY_CHECKS = 1;

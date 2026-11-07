-- Inventory audit tool
--   * copy.verified_at       - "seen on the shelf" marker so an audit can resume across sessions
--   * audit_session          - one row per applied batch of removals (or restores)
--   * audit_session_item     - every record soft-deleted by that batch, so it can be undone

ALTER TABLE `copy`
  ADD COLUMN `verified_at` DATETIME DEFAULT NULL AFTER `notes`,
  ADD INDEX `idx_copy_verified` (`verified_at`);

CREATE TABLE IF NOT EXISTS `audit_session` (
  `audit_session_id` INT NOT NULL AUTO_INCREMENT,
  `note` VARCHAR(255) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `restored_at` DATETIME DEFAULT NULL,
  PRIMARY KEY (`audit_session_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `audit_session_item` (
  `audit_session_item_id` INT NOT NULL AUTO_INCREMENT,
  `audit_session_id` INT NOT NULL,
  `entity_type` ENUM('series', 'volume', 'issue', 'copy') NOT NULL,
  `entity_id` INT NOT NULL,
  `label` VARCHAR(255) DEFAULT NULL,
  `cost` DECIMAL(10,2) DEFAULT NULL,
  `value` DECIMAL(10,2) DEFAULT NULL,
  PRIMARY KEY (`audit_session_item_id`),
  INDEX `idx_asi_session` (`audit_session_id`, `entity_type`),
  CONSTRAINT `fk_asi_session` FOREIGN KEY (`audit_session_id`)
    REFERENCES `audit_session` (`audit_session_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

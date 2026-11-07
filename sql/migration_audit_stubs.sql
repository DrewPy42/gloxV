-- Stub records created by the audit quick-add. is_stub = 1 means "needs details";
-- the audit page's "Needs details" tab lists them until they are marked complete.

ALTER TABLE `series` ADD COLUMN `is_stub` TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE `volume` ADD COLUMN `is_stub` TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE `issue`  ADD COLUMN `is_stub` TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE `copy`   ADD COLUMN `is_stub` TINYINT(1) NOT NULL DEFAULT 0;

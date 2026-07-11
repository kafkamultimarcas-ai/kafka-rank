SET @add_last_edited_by = IF (
  EXISTS(
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'fei_records'
      AND column_name = 'lastEditedBy'
  ),
  'SELECT 1',
  'ALTER TABLE `fei_records` ADD COLUMN `lastEditedBy` varchar(255)'
);--> statement-breakpoint
PREPARE add_last_edited_by_stmt FROM @add_last_edited_by;--> statement-breakpoint
EXECUTE add_last_edited_by_stmt;--> statement-breakpoint
DEALLOCATE PREPARE add_last_edited_by_stmt;--> statement-breakpoint
SET @add_last_edited_at = IF (
  EXISTS(
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'fei_records'
      AND column_name = 'lastEditedAt'
  ),
  'SELECT 1',
  'ALTER TABLE `fei_records` ADD COLUMN `lastEditedAt` bigint'
);--> statement-breakpoint
PREPARE add_last_edited_at_stmt FROM @add_last_edited_at;--> statement-breakpoint
EXECUTE add_last_edited_at_stmt;--> statement-breakpoint
DEALLOCATE PREPARE add_last_edited_at_stmt;--> statement-breakpoint
SET @add_edit_notes = IF (
  EXISTS(
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'fei_records'
      AND column_name = 'editNotes'
  ),
  'SELECT 1',
  'ALTER TABLE `fei_records` ADD COLUMN `editNotes` text'
);--> statement-breakpoint
PREPARE add_edit_notes_stmt FROM @add_edit_notes;--> statement-breakpoint
EXECUTE add_edit_notes_stmt;--> statement-breakpoint
DEALLOCATE PREPARE add_edit_notes_stmt;--> statement-breakpoint
ALTER TABLE `fei_records` MODIFY COLUMN `lastEditedAt` bigint;

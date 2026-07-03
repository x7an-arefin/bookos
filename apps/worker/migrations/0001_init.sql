CREATE TABLE IF NOT EXISTS `users` (
  `id` text PRIMARY KEY NOT NULL,
  `email` text NOT NULL UNIQUE,
  `password_hash` text NOT NULL,
  `plan` text NOT NULL DEFAULT 'free',
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  `deleted_at` integer
);

CREATE INDEX IF NOT EXISTS `users_plan_idx` ON `users` (`plan`);

CREATE TABLE IF NOT EXISTS `sessions` (
  `jti` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL REFERENCES `users`(`id`),
  `created_at` integer NOT NULL,
  `expires_at` integer NOT NULL,
  `revoked_at` integer,
  `device_hint` text
);

CREATE INDEX IF NOT EXISTS `sessions_user_id_idx` ON `sessions` (`user_id`);

CREATE TABLE IF NOT EXISTS `books` (
  `id` text PRIMARY KEY NOT NULL,
  `owner_id` text NOT NULL REFERENCES `users`(`id`),
  `title` text NOT NULL,
  `author` text NOT NULL,
  `subtitle` text,
  `isbn` text,
  `language` text NOT NULL DEFAULT 'en',
  `publisher` text,
  `config_json` text NOT NULL DEFAULT '{}',
  `theme_slug` text NOT NULL DEFAULT 'classic-serif',
  `word_count` integer NOT NULL DEFAULT 0,
  `chapter_count` integer NOT NULL DEFAULT 0,
  `last_sync_at` integer,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  `deleted_at` integer
);

CREATE INDEX IF NOT EXISTS `books_owner_id_idx` ON `books` (`owner_id`);
CREATE INDEX IF NOT EXISTS `books_owner_deleted_idx` ON `books` (`owner_id`, `deleted_at`);
CREATE INDEX IF NOT EXISTS `books_title_idx` ON `books` (`title`);
CREATE INDEX IF NOT EXISTS `books_updated_at_idx` ON `books` (`updated_at`);

CREATE TABLE IF NOT EXISTS `chapters` (
  `id` text PRIMARY KEY NOT NULL,
  `book_id` text NOT NULL REFERENCES `books`(`id`) ON DELETE CASCADE,
  `title` text NOT NULL,
  `sort_order` integer NOT NULL,
  `content_markdown` text NOT NULL DEFAULT '',
  `front_matter_json` text,
  `word_count` integer NOT NULL DEFAULT 0,
  `last_modified` integer NOT NULL,
  `created_at` integer NOT NULL
);

CREATE INDEX IF NOT EXISTS `chapters_book_id_idx` ON `chapters` (`book_id`);
CREATE INDEX IF NOT EXISTS `chapters_book_sort_idx` ON `chapters` (`book_id`, `sort_order`);

CREATE TABLE IF NOT EXISTS `snapshots` (
  `id` text PRIMARY KEY NOT NULL,
  `book_id` text NOT NULL REFERENCES `books`(`id`) ON DELETE CASCADE,
  `label` text,
  `snapshot_json` text NOT NULL,
  `chapter_count` integer NOT NULL,
  `word_count` integer NOT NULL,
  `created_at` integer NOT NULL,
  `is_auto` integer NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS `snapshots_book_id_idx` ON `snapshots` (`book_id`);

CREATE TABLE IF NOT EXISTS `assets` (
  `id` text PRIMARY KEY NOT NULL,
  `book_id` text REFERENCES `books`(`id`) ON DELETE CASCADE,
  `owner_id` text NOT NULL REFERENCES `users`(`id`),
  `filename` text NOT NULL,
  `mime_type` text NOT NULL,
  `file_size_bytes` integer NOT NULL,
  `cloud_url` text NOT NULL,
  `thumbnail_url` text NOT NULL,
  `created_at` integer NOT NULL
);

CREATE INDEX IF NOT EXISTS `assets_book_id_idx` ON `assets` (`book_id`);
CREATE INDEX IF NOT EXISTS `assets_owner_id_idx` ON `assets` (`owner_id`);

CREATE TABLE IF NOT EXISTS `comments` (
  `id` text PRIMARY KEY NOT NULL,
  `chapter_id` text NOT NULL REFERENCES `chapters`(`id`) ON DELETE CASCADE,
  `parent_id` text REFERENCES `comments`(`id`),
  `author_id` text NOT NULL REFERENCES `users`(`id`),
  `text` text NOT NULL,
  `range_start` integer NOT NULL,
  `range_end` integer NOT NULL,
  `is_resolved` integer NOT NULL DEFAULT 0,
  `created_at` integer NOT NULL
);

CREATE INDEX IF NOT EXISTS `comments_chapter_id_idx` ON `comments` (`chapter_id`);

CREATE TABLE IF NOT EXISTS `collab_sessions` (
  `id` text PRIMARY KEY NOT NULL,
  `book_id` text NOT NULL REFERENCES `books`(`id`) ON DELETE CASCADE,
  `invited_email` text NOT NULL,
  `permission` text NOT NULL DEFAULT 'reviewer',
  `invited_by` text NOT NULL REFERENCES `users`(`id`),
  `accepted_at` integer,
  `expires_at` integer NOT NULL,
  `created_at` integer NOT NULL
);

CREATE INDEX IF NOT EXISTS `collab_sessions_book_id_idx` ON `collab_sessions` (`book_id`);

CREATE TABLE IF NOT EXISTS `themes` (
  `id` text PRIMARY KEY NOT NULL,
  `slug` text NOT NULL UNIQUE,
  `name` text NOT NULL,
  `description` text,
  `css_url` text NOT NULL,
  `config_json` text,
  `is_premium` integer NOT NULL DEFAULT 0,
  `price_usd` real,
  `created_at` integer NOT NULL
);

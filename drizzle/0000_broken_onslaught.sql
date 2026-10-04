CREATE TABLE `blocks` (
	`id` text PRIMARY KEY NOT NULL,
	`blocker` text NOT NULL,
	`blocked` text NOT NULL,
	`reason` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`blocker`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`blocked`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_blocks_pair` ON `blocks` (`blocker`,`blocked`);--> statement-breakpoint
CREATE TABLE `connections` (
	`id` text PRIMARY KEY NOT NULL,
	`sender` text NOT NULL,
	`receiver` text NOT NULL,
	`pair` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`note` text NOT NULL,
	`sender_photo` integer DEFAULT 0 NOT NULL,
	`receiver_photo` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`accepted_at` text,
	FOREIGN KEY (`sender`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`receiver`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `connections_pair_unique` ON `connections` (`pair`);--> statement-breakpoint
CREATE TABLE `coupons` (
	`code` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`redeemed_at` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `messages` (
	`id` text PRIMARY KEY NOT NULL,
	`connection_id` text NOT NULL,
	`sender` text NOT NULL,
	`body` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`connection_id`) REFERENCES `connections`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`sender`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` text PRIMARY KEY NOT NULL,
	`profile_id` text NOT NULL,
	`payment_id` text,
	`status` text DEFAULT 'created' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `orders_payment_id_unique` ON `orders` (`payment_id`);--> statement-breakpoint
CREATE TABLE `profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`dob` text NOT NULL,
	`gender` text NOT NULL,
	`city` text NOT NULL,
	`profession` text NOT NULL,
	`education` text NOT NULL,
	`sect` text NOT NULL,
	`language` text NOT NULL,
	`marital` text NOT NULL,
	`manager` text NOT NULL,
	`about` text NOT NULL,
	`values` text NOT NULL,
	`pref_min` integer NOT NULL,
	`pref_max` integer NOT NULL,
	`pref_city` text DEFAULT '' NOT NULL,
	`photo_key` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`fee` text DEFAULT 'unpaid' NOT NULL,
	`oath_at` text NOT NULL,
	`terms_version` text DEFAULT '2026-10-02' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `profiles_user_id_unique` ON `profiles` (`user_id`);--> statement-breakpoint
CREATE TABLE `support` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`email` text NOT NULL,
	`category` text NOT NULL,
	`message` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`coupon` text,
	`created_at` text NOT NULL
);

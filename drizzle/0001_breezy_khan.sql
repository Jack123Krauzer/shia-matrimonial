CREATE INDEX `idx_connections_sender` ON `connections` (`sender`);--> statement-breakpoint
CREATE INDEX `idx_connections_receiver` ON `connections` (`receiver`);--> statement-breakpoint
CREATE INDEX `idx_messages_connection_time` ON `messages` (`connection_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_orders_profile` ON `orders` (`profile_id`);--> statement-breakpoint
CREATE INDEX `idx_profiles_status_gender` ON `profiles` (`status`,`gender`);--> statement-breakpoint
CREATE INDEX `idx_support_user` ON `support` (`user_id`);
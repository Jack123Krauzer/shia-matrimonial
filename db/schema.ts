import { integer, sqliteTable, text, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
export const profiles = sqliteTable('profiles', {
  id: text('id').primaryKey(), userId: text('user_id').notNull().unique(),
  name: text('name').notNull(), email: text('email').notNull(), dob: text('dob').notNull(),
  gender: text('gender').notNull(), city: text('city').notNull(), profession: text('profession').notNull(),
  education: text('education').notNull(), sect: text('sect').notNull(), language: text('language').notNull(),
  marital: text('marital').notNull(), manager: text('manager').notNull(), about: text('about').notNull(),
  values: text('values').notNull(), prefMin: integer('pref_min').notNull(), prefMax: integer('pref_max').notNull(),
  prefCity: text('pref_city').notNull().default(''), photoKey: text('photo_key'),
  status: text('status').notNull().default('pending'), fee: text('fee').notNull().default('unpaid'),
  oathAt: text('oath_at').notNull(), termsVersion: text('terms_version').notNull().default('2026-10-02'), createdAt: text('created_at').notNull(),
}, t=>[index('idx_profiles_status_gender').on(t.status,t.gender)]);
export const connections = sqliteTable('connections', {
  id: text('id').primaryKey(), sender: text('sender').notNull().references(()=>profiles.id),
  receiver: text('receiver').notNull().references(()=>profiles.id), pair: text('pair').notNull().unique(),
  status: text('status').notNull().default('pending'), note: text('note').notNull(),
  senderPhoto: integer('sender_photo').notNull().default(0), receiverPhoto: integer('receiver_photo').notNull().default(0),
  createdAt: text('created_at').notNull(), acceptedAt: text('accepted_at'),
},t=>[index('idx_connections_sender').on(t.sender),index('idx_connections_receiver').on(t.receiver)]);
export const messages = sqliteTable('messages', {
  id: text('id').primaryKey(), connectionId: text('connection_id').notNull().references(()=>connections.id),
  sender: text('sender').notNull().references(()=>profiles.id), body: text('body').notNull(), createdAt: text('created_at').notNull(),
},t=>[index('idx_messages_connection_time').on(t.connectionId,t.createdAt)]);
export const support = sqliteTable('support', {
  id: text('id').primaryKey(), userId: text('user_id').notNull(), email: text('email').notNull(),
  category: text('category').notNull(), message: text('message').notNull(),
  status: text('status').notNull().default('pending'), coupon: text('coupon'), createdAt: text('created_at').notNull(),
},t=>[index('idx_support_user').on(t.userId)]);
export const coupons = sqliteTable('coupons', {
  code: text('code').primaryKey(), userId: text('user_id').notNull(), redeemedAt: text('redeemed_at'), createdAt: text('created_at').notNull(),
});
export const orders = sqliteTable('orders', {
  id: text('id').primaryKey(), profileId: text('profile_id').notNull().references(()=>profiles.id),
  paymentId: text('payment_id').unique(), status: text('status').notNull().default('created'), createdAt: text('created_at').notNull(),
},t=>[index('idx_orders_profile').on(t.profileId)]);
export const blocks = sqliteTable('blocks', {
  id: text('id').primaryKey(), blocker: text('blocker').notNull().references(()=>profiles.id),
  blocked: text('blocked').notNull().references(()=>profiles.id), reason: text('reason').notNull(), createdAt: text('created_at').notNull(),
},t=>[uniqueIndex('idx_blocks_pair').on(t.blocker,t.blocked)]);

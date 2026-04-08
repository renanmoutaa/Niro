import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const leads = sqliteTable('leads', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').unique(),
  device: text('device'),
  ip: text('ip'),
  mac: text('mac'),
  status: text('status'),
  location: text('location'),
  bandwidthUsed: integer('bandwidth_used').default(0),
  connectedAt: text('connected_at'),
  lastSeen: text('last_seen'),
  phone: text('phone'),
  cpf: text('cpf'),
  income: text('income'),
  neighborhood: text('neighborhood'),
  age: text('age'),
  city: text('city'),
  state: text('state'),
});

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  password: text('password').notNull(),
});

export const messages = sqliteTable('messages', {
  id: text('id').primaryKey(),
  leadId: text('lead_id').notNull(),
  content: text('content').notNull(),
  direction: text('direction').default('outbound'),
  status: text('status').default('queued'),
  type: text('type').default('sms'),
  createdAt: integer('created_at').default(Date.now()),
});

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: integer('updated_at').default(Date.now()),
});

export const templates = sqliteTable('templates', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  type: text('type').default('sms'),
  createdAt: integer('created_at').default(Date.now()),
});

export type Lead = typeof leads.$inferSelect;
export type NewLead = typeof leads.$inferInsert;
export type User = typeof users.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type Setting = typeof settings.$inferSelect;
export type Template = typeof templates.$inferSelect;

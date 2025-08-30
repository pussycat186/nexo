import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, json, boolean, integer, bigint } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  handle: text("handle").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const devices = pgTable("devices", {
  id: varchar("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  ed25519Pub: text("ed25519_pub").notNull(),
  x25519Pub: text("x25519_pub"),
  name: text("name"),
  lastSeen: timestamp("last_seen"),
  revoked: boolean("revoked").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const refreshTokens = pgTable("refresh_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  token: text("token").notNull().unique(),
  deviceId: varchar("device_id").references(() => devices.id).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const conversations = pgTable("conversations", {
  id: varchar("id").primaryKey(),
  kind: text("kind").default("direct"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const participants = pgTable("participants", {
  conversationId: varchar("conversation_id").references(() => conversations.id).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
});

export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: varchar("conversation_id").references(() => conversations.id).notNull(),
  senderDeviceId: varchar("sender_device_id").references(() => devices.id).notNull(),
  cipher: text("cipher"),
  nonce: text("nonce"),
  ad: json("ad").$type<Record<string, any>>(),
  timestamp: bigint("timestamp", { mode: "number" }).notNull(),
  sthIndex: integer("sth_index"),
  deleted: boolean("deleted").default(false),
  deletedForMe: text("deleted_for_me").array().default(sql`ARRAY[]::text[]`),
  edited: boolean("edited").default(false),
  editedAt: timestamp("edited_at"),
  ttl: integer("ttl"), // TTL in seconds
  expiresAt: timestamp("expires_at"),
});

export const messageAcks = pgTable("message_acks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  messageId: varchar("message_id").references(() => messages.id).notNull(),
  deviceId: varchar("device_id").references(() => devices.id).notNull(),
  ackType: text("ack_type").notNull(), // 'delivered' | 'read'
  timestamp: timestamp("timestamp").defaultNow(),
});

export const sth = pgTable("sth", {
  idx: integer("idx").primaryKey(),
  root: text("root").notNull(),
  leaf: text("leaf").notNull(),
  timestamp: timestamp("timestamp").defaultNow(),
});

export const sessionKeys = pgTable("session_keys", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: varchar("conversation_id").references(() => conversations.id).notNull(),
  deviceId: varchar("device_id").references(() => devices.id).notNull(),
  keyIndex: integer("key_index").notNull(),
  publicKey: text("public_key").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertDeviceSchema = createInsertSchema(devices).omit({
  createdAt: true,
  lastSeen: true,
});

export const insertConversationSchema = createInsertSchema(conversations).omit({
  id: true,
  createdAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  editedAt: true,
  expiresAt: true,
});

export const insertRefreshTokenSchema = createInsertSchema(refreshTokens).omit({
  id: true,
  createdAt: true,
});

export const insertMessageAckSchema = createInsertSchema(messageAcks).omit({
  id: true,
  timestamp: true,
});

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Device = typeof devices.$inferSelect;
export type InsertDevice = z.infer<typeof insertDeviceSchema>;
export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type RefreshToken = typeof refreshTokens.$inferSelect;
export type InsertRefreshToken = z.infer<typeof insertRefreshTokenSchema>;
export type MessageAck = typeof messageAcks.$inferSelect;
export type InsertMessageAck = z.infer<typeof insertMessageAckSchema>;
export type STH = typeof sth.$inferSelect;
export type SessionKey = typeof sessionKeys.$inferSelect;

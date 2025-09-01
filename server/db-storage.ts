import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { drizzle as drizzleSqlite } from "drizzle-orm/better-sqlite3";
import { neon } from "@neondatabase/serverless";
import Database from "better-sqlite3";
import { eq, and, or, gt, desc, sql } from "drizzle-orm";
import * as schema from "@shared/schema";
import type { IStorage } from "./storage";
import { randomUUID } from "crypto";
import { existsSync, mkdirSync } from "fs";
import { dirname } from "path";

// Default to SQLite if DATABASE_URL is not set
let db: any;

if (process.env.DATABASE_URL) {
  console.log('[DB] Using PostgreSQL database');
  const queryClient = neon(process.env.DATABASE_URL);
  db = drizzleNeon(queryClient, { schema });
} else {
  console.log('[DB] Using SQLite database at ./data/nexo.db');
  
  // Ensure data directory exists
  const dbPath = './data/nexo.db';
  const dataDir = dirname(dbPath);
  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true });
  }
  
  const sqlite = new Database(dbPath);
  db = drizzleSqlite(sqlite, { schema });
  
  // Enable foreign keys in SQLite
  sqlite.exec('PRAGMA foreign_keys = ON');
}

export class PostgreSQLStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<schema.User | undefined> {
    const result = await db.select().from(schema.users).where(eq(schema.users.id, id));
    return result[0];
  }

  async getUserByHandle(handle: string): Promise<schema.User | undefined> {
    const result = await db.select().from(schema.users).where(eq(schema.users.handle, handle));
    return result[0];
  }

  async createUser(user: schema.InsertUser): Promise<schema.User> {
    const result = await db.insert(schema.users).values(user).returning();
    return result[0];
  }

  // Devices
  async getDevice(id: string): Promise<schema.Device | undefined> {
    const result = await db.select().from(schema.devices).where(eq(schema.devices.id, id));
    return result[0];
  }

  async getDevicesByUserId(userId: string): Promise<schema.Device[]> {
    return await db.select().from(schema.devices)
      .where(and(eq(schema.devices.userId, userId), eq(schema.devices.revoked, false)));
  }

  async createDevice(device: schema.InsertDevice): Promise<schema.Device> {
    const result = await db.insert(schema.devices).values(device).returning();
    return result[0];
  }

  async updateDevice(id: string, updates: Partial<schema.Device>): Promise<schema.Device | undefined> {
    const result = await db.update(schema.devices)
      .set(updates)
      .where(eq(schema.devices.id, id))
      .returning();
    return result[0];
  }

  async revokeDevice(id: string): Promise<boolean> {
    const result = await db.update(schema.devices)
      .set({ revoked: true })
      .where(eq(schema.devices.id, id))
      .returning();
    return result.length > 0;
  }

  // Refresh Tokens
  async createRefreshToken(token: schema.InsertRefreshToken): Promise<schema.RefreshToken> {
    const result = await db.insert(schema.refreshTokens).values(token).returning();
    return result[0];
  }

  async getRefreshToken(token: string): Promise<schema.RefreshToken | undefined> {
    const result = await db.select().from(schema.refreshTokens)
      .where(eq(schema.refreshTokens.token, token));
    return result[0];
  }

  async deleteRefreshToken(token: string): Promise<boolean> {
    const result = await db.delete(schema.refreshTokens)
      .where(eq(schema.refreshTokens.token, token))
      .returning();
    return result.length > 0;
  }

  async deleteExpiredRefreshTokens(): Promise<void> {
    await db.delete(schema.refreshTokens)
      .where(sql`${schema.refreshTokens.expiresAt} < NOW()`);
  }

  // Conversations
  async getConversation(id: string): Promise<schema.Conversation | undefined> {
    const result = await db.select().from(schema.conversations).where(eq(schema.conversations.id, id));
    return result[0];
  }

  async getConversationsByUserId(userId: string): Promise<schema.Conversation[]> {
    const participantConvIds = await db.select({ conversationId: schema.participants.conversationId })
      .from(schema.participants)
      .where(eq(schema.participants.userId, userId));
    
    if (participantConvIds.length === 0) return [];
    
    const convIds = participantConvIds.map((p: any) => p.conversationId);
    return await db.select().from(schema.conversations)
      .where(sql`${schema.conversations.id} IN (${sql.raw(convIds.map((id: any) => `'${id}'`).join(','))})`);
  }

  async createConversation(conversation: schema.InsertConversation): Promise<schema.Conversation> {
    const id = randomUUID();
    const result = await db.insert(schema.conversations)
      .values({ ...conversation, id })
      .returning();
    return result[0];
  }

  async getOrCreateDirectConversation(userId1: string, userId2: string): Promise<schema.Conversation> {
    // Create consistent conversation ID
    const convKey = [userId1, userId2].sort().join(':');
    
    // Check if exists
    const existing = await this.getConversation(convKey);
    if (existing) return existing;
    
    // Create new
    const result = await db.insert(schema.conversations)
      .values({ id: convKey, kind: 'direct' })
      .returning();
    
    // Add participants
    await db.insert(schema.participants)
      .values([
        { conversationId: convKey, userId: userId1 },
        { conversationId: convKey, userId: userId2 }
      ]);
    
    return result[0];
  }

  // Messages
  async getMessagesByConversationId(conversationId: string, since?: number): Promise<schema.Message[]> {
    let query = db.select().from(schema.messages)
      .where(eq(schema.messages.conversationId, conversationId));
    
    if (since) {
      query = query.where(gt(schema.messages.timestamp, since));
    }
    
    return await query.orderBy(schema.messages.timestamp);
  }

  async createMessage(message: schema.InsertMessage): Promise<schema.Message> {
    // Set TTL expiration if needed
    let expiresAt = undefined;
    if (message.ttl) {
      expiresAt = new Date(Date.now() + message.ttl * 1000);
    }
    
    const result = await db.insert(schema.messages)
      .values({ ...message, expiresAt })
      .returning();
    return result[0];
  }

  async updateMessage(id: string, updates: Partial<schema.Message>): Promise<schema.Message | undefined> {
    const result = await db.update(schema.messages)
      .set(updates)
      .where(eq(schema.messages.id, id))
      .returning();
    return result[0];
  }

  async deleteMessage(id: string): Promise<boolean> {
    const result = await db.update(schema.messages)
      .set({ 
        deleted: true, 
        cipher: null,
        ad: { type: 'delete' } 
      })
      .where(eq(schema.messages.id, id))
      .returning();
    return result.length > 0;
  }

  async deleteMessageForUser(messageId: string, userId: string): Promise<boolean> {
    const message = await db.select().from(schema.messages)
      .where(eq(schema.messages.id, messageId));
    
    if (!message[0]) return false;
    
    const deletedForMe = message[0].deletedForMe || [];
    if (!deletedForMe.includes(userId)) {
      deletedForMe.push(userId);
    }
    
    const result = await db.update(schema.messages)
      .set({ deletedForMe })
      .where(eq(schema.messages.id, messageId))
      .returning();
    
    return result.length > 0;
  }

  async deleteExpiredMessages(): Promise<void> {
    await db.delete(schema.messages)
      .where(sql`${schema.messages.expiresAt} < NOW()`);
  }

  // Message Acknowledgments
  async createMessageAck(ack: schema.InsertMessageAck): Promise<schema.MessageAck> {
    const result = await db.insert(schema.messageAcks).values(ack).returning();
    return result[0];
  }

  async getMessageAcks(messageId: string): Promise<schema.MessageAck[]> {
    return await db.select().from(schema.messageAcks)
      .where(eq(schema.messageAcks.messageId, messageId));
  }

  // Participants
  async addParticipant(conversationId: string, userId: string): Promise<void> {
    await db.insert(schema.participants)
      .values({ conversationId, userId })
      .onConflictDoNothing();
  }

  async getParticipants(conversationId: string): Promise<string[]> {
    const result = await db.select({ userId: schema.participants.userId })
      .from(schema.participants)
      .where(eq(schema.participants.conversationId, conversationId));
    return result.map((p: any) => p.userId);
  }

  async isParticipant(conversationId: string, userId: string): Promise<boolean> {
    const result = await db.select().from(schema.participants)
      .where(and(
        eq(schema.participants.conversationId, conversationId),
        eq(schema.participants.userId, userId)
      ));
    return result.length > 0;
  }

  // STH
  async createSTH(idx: number, root: string, leaf: string): Promise<schema.STH> {
    const result = await db.insert(schema.sth)
      .values({ idx, root, leaf })
      .returning();
    return result[0];
  }

  async getSTHList(limit = 100): Promise<schema.STH[]> {
    return await db.select().from(schema.sth)
      .orderBy(desc(schema.sth.idx))
      .limit(limit);
  }

  async getSTHByIndex(idx: number): Promise<schema.STH | undefined> {
    const result = await db.select().from(schema.sth)
      .where(eq(schema.sth.idx, idx));
    return result[0];
  }

  // Session Keys
  async createSessionKey(conversationId: string, deviceId: string, keyIndex: number, publicKey: string): Promise<void> {
    await db.insert(schema.sessionKeys)
      .values({ conversationId, deviceId, keyIndex, publicKey });
  }

  async getLatestSessionKey(conversationId: string, deviceId: string): Promise<schema.SessionKey | undefined> {
    const result = await db.select().from(schema.sessionKeys)
      .where(and(
        eq(schema.sessionKeys.conversationId, conversationId),
        eq(schema.sessionKeys.deviceId, deviceId)
      ))
      .orderBy(desc(schema.sessionKeys.keyIndex))
      .limit(1);
    return result[0];
  }

  // Health check
  async getStats(): Promise<{ users: number; devices: number; messages: number; sth: number }> {
    const [users, devices, messages, sth] = await Promise.all([
      db.select({ count: sql`COUNT(*)` }).from(schema.users),
      db.select({ count: sql`COUNT(*)` }).from(schema.devices),
      db.select({ count: sql`COUNT(*)` }).from(schema.messages),
      db.select({ count: sql`COUNT(*)` }).from(schema.sth),
    ]);
    
    return {
      users: Number(users[0]?.count || 0),
      devices: Number(devices[0]?.count || 0),
      messages: Number(messages[0]?.count || 0),
      sth: Number(sth[0]?.count || 0),
    };
  }
}

export const dbStorage = new PostgreSQLStorage();
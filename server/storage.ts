import { type User, type InsertUser, type Device, type InsertDevice, type Conversation, type InsertConversation, type Message, type InsertMessage, type RefreshToken, type InsertRefreshToken, type MessageAck, type InsertMessageAck, type STH, type SessionKey } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByHandle(handle: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Devices
  getDevice(id: string): Promise<Device | undefined>;
  getDevicesByUserId(userId: string): Promise<Device[]>;
  createDevice(device: InsertDevice): Promise<Device>;
  updateDevice(id: string, updates: Partial<Device>): Promise<Device | undefined>;
  revokeDevice(id: string): Promise<boolean>;

  // Refresh Tokens
  createRefreshToken(token: InsertRefreshToken): Promise<RefreshToken>;
  getRefreshToken(token: string): Promise<RefreshToken | undefined>;
  deleteRefreshToken(token: string): Promise<boolean>;
  deleteExpiredRefreshTokens(): Promise<void>;

  // Conversations
  getConversation(id: string): Promise<Conversation | undefined>;
  getConversationsByUserId(userId: string): Promise<Conversation[]>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  getOrCreateDirectConversation(userId1: string, userId2: string): Promise<Conversation>;

  // Messages
  getMessagesByConversationId(conversationId: string, since?: number): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  updateMessage(id: string, updates: Partial<Message>): Promise<Message | undefined>;
  deleteMessage(id: string): Promise<boolean>;
  deleteMessageForUser(messageId: string, userId: string): Promise<boolean>;
  deleteExpiredMessages(): Promise<void>;

  // Message Acknowledgments
  createMessageAck(ack: InsertMessageAck): Promise<MessageAck>;
  getMessageAcks(messageId: string): Promise<MessageAck[]>;

  // Participants
  addParticipant(conversationId: string, userId: string): Promise<void>;
  getParticipants(conversationId: string): Promise<string[]>;
  isParticipant(conversationId: string, userId: string): Promise<boolean>;

  // STH
  createSTH(idx: number, root: string, leaf: string): Promise<STH>;
  getSTHList(limit?: number): Promise<STH[]>;
  getSTHByIndex(idx: number): Promise<STH | undefined>;

  // Session Keys
  createSessionKey(conversationId: string, deviceId: string, keyIndex: number, publicKey: string): Promise<void>;
  getLatestSessionKey(conversationId: string, deviceId: string): Promise<SessionKey | undefined>;

  // Health check
  getStats(): Promise<{ users: number; devices: number; messages: number; sth: number }>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private devices: Map<string, Device> = new Map();
  private conversations: Map<string, Conversation> = new Map();
  private messages: Map<string, Message> = new Map();
  private participants: Map<string, Set<string>> = new Map();
  private refreshTokens: Map<string, RefreshToken> = new Map();
  private messageAcks: Map<string, MessageAck[]> = new Map();
  private sthRecords: Map<number, STH> = new Map();
  private sessionKeys: Map<string, SessionKey[]> = new Map();

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByHandle(handle: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.handle === handle);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { 
      ...insertUser, 
      id, 
      createdAt: new Date() 
    };
    this.users.set(id, user);
    return user;
  }

  async getDevice(id: string): Promise<Device | undefined> {
    return this.devices.get(id);
  }

  async getDevicesByUserId(userId: string): Promise<Device[]> {
    return Array.from(this.devices.values()).filter(device => device.userId === userId);
  }

  async createDevice(device: InsertDevice): Promise<Device> {
    const newDevice: Device = { 
      ...device, 
      createdAt: new Date(),
      lastSeen: new Date() 
    } as Device;
    this.devices.set(device.id, newDevice);
    return newDevice;
  }

  async updateDevice(id: string, updates: Partial<Device>): Promise<Device | undefined> {
    const device = this.devices.get(id);
    if (!device) return undefined;
    
    const updated = { ...device, ...updates };
    this.devices.set(id, updated);
    return updated;
  }

  async revokeDevice(id: string): Promise<boolean> {
    const device = this.devices.get(id);
    if (!device) return false;
    device.revoked = true;
    return true;
  }

  // Refresh Tokens
  async createRefreshToken(token: InsertRefreshToken): Promise<RefreshToken> {
    const id = randomUUID();
    const refreshToken: RefreshToken = { ...token, id, createdAt: new Date() };
    this.refreshTokens.set(token.token, refreshToken);
    return refreshToken;
  }

  async getRefreshToken(token: string): Promise<RefreshToken | undefined> {
    return this.refreshTokens.get(token);
  }

  async deleteRefreshToken(token: string): Promise<boolean> {
    return this.refreshTokens.delete(token);
  }

  async deleteExpiredRefreshTokens(): Promise<void> {
    const now = new Date();
    const entries = Array.from(this.refreshTokens.entries());
    for (const [token, refreshToken] of entries) {
      if (refreshToken.expiresAt < now) {
        this.refreshTokens.delete(token);
      }
    }
  }

  async getConversation(id: string): Promise<Conversation | undefined> {
    return this.conversations.get(id);
  }

  async getConversationsByUserId(userId: string): Promise<Conversation[]> {
    const userConversations: Conversation[] = [];
    const entries = Array.from(this.participants.entries());
    for (const [convId, participants] of entries) {
      if (participants.has(userId)) {
        const conversation = this.conversations.get(convId);
        if (conversation) {
          userConversations.push(conversation);
        }
      }
    }
    return userConversations;
  }

  async createConversation(conversation: InsertConversation): Promise<Conversation> {
    const id = randomUUID();
    const newConversation: Conversation = { 
      id,
      kind: conversation.kind || 'direct',
      createdAt: new Date() 
    };
    this.conversations.set(id, newConversation);
    this.participants.set(id, new Set());
    return newConversation;
  }

  async getOrCreateDirectConversation(userId1: string, userId2: string): Promise<Conversation> {
    // Check if conversation already exists
    const entries = Array.from(this.participants.entries());
    for (const [convId, participants] of entries) {
      if (participants.has(userId1) && participants.has(userId2) && participants.size === 2) {
        const conversation = this.conversations.get(convId);
        if (conversation && conversation.kind === "direct") {
          return conversation;
        }
      }
    }

    // Create new conversation
    const conversation = await this.createConversation({ kind: "direct" });
    await this.addParticipant(conversation.id, userId1);
    await this.addParticipant(conversation.id, userId2);
    return conversation;
  }

  async getMessagesByConversationId(conversationId: string, since?: number): Promise<Message[]> {
    const messages = Array.from(this.messages.values())
      .filter(msg => msg.conversationId === conversationId)
      .filter(msg => !since || msg.timestamp > since)
      .sort((a, b) => a.timestamp - b.timestamp);
    return messages;
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const id = randomUUID();
    let expiresAt = null;
    if (message.ttl) {
      expiresAt = new Date(Date.now() + message.ttl * 1000);
    }
    const newMessage: Message = { 
      ...message, 
      id, 
      expiresAt, 
      deletedForMe: [],
      editedAt: null,
      nonce: message.nonce || null
    } as Message;
    this.messages.set(id, newMessage);
    return newMessage;
  }

  async updateMessage(id: string, updates: Partial<Message>): Promise<Message | undefined> {
    const message = this.messages.get(id);
    if (!message) return undefined;
    
    const updated = { ...message, ...updates };
    this.messages.set(id, updated);
    return updated;
  }

  async deleteMessage(id: string): Promise<boolean> {
    const message = this.messages.get(id);
    if (!message) return false;
    
    // Mark as deleted for everyone
    message.deleted = true;
    message.cipher = null;
    message.ad = { ...message.ad, type: "delete" };
    return true;
  }

  async deleteMessageForUser(messageId: string, userId: string): Promise<boolean> {
    const message = this.messages.get(messageId);
    if (!message) return false;
    
    if (!message.deletedForMe) message.deletedForMe = [];
    if (!message.deletedForMe.includes(userId)) {
      message.deletedForMe.push(userId);
    }
    return true;
  }

  async deleteExpiredMessages(): Promise<void> {
    const now = new Date();
    const entries = Array.from(this.messages.entries());
    for (const [id, message] of entries) {
      if (message.expiresAt && message.expiresAt < now) {
        this.messages.delete(id);
      }
    }
  }

  // Message Acknowledgments
  async createMessageAck(ack: InsertMessageAck): Promise<MessageAck> {
    const id = randomUUID();
    const newAck: MessageAck = { ...ack, id, timestamp: new Date() };
    
    if (!this.messageAcks.has(ack.messageId)) {
      this.messageAcks.set(ack.messageId, []);
    }
    this.messageAcks.get(ack.messageId)!.push(newAck);
    return newAck;
  }

  async getMessageAcks(messageId: string): Promise<MessageAck[]> {
    return this.messageAcks.get(messageId) || [];
  }

  async addParticipant(conversationId: string, userId: string): Promise<void> {
    if (!this.participants.has(conversationId)) {
      this.participants.set(conversationId, new Set());
    }
    this.participants.get(conversationId)!.add(userId);
  }

  async getParticipants(conversationId: string): Promise<string[]> {
    const participants = this.participants.get(conversationId);
    return participants ? Array.from(participants) : [];
  }

  async isParticipant(conversationId: string, userId: string): Promise<boolean> {
    const participants = this.participants.get(conversationId);
    return participants ? participants.has(userId) : false;
  }

  // STH
  async createSTH(idx: number, root: string, leaf: string): Promise<STH> {
    const sth: STH = { idx, root, leaf, timestamp: new Date() };
    this.sthRecords.set(idx, sth);
    return sth;
  }

  async getSTHList(limit = 100): Promise<STH[]> {
    const list = Array.from(this.sthRecords.values());
    return list.slice(-limit).reverse();
  }

  async getSTHByIndex(idx: number): Promise<STH | undefined> {
    return this.sthRecords.get(idx);
  }

  // Session Keys
  async createSessionKey(conversationId: string, deviceId: string, keyIndex: number, publicKey: string): Promise<void> {
    const key = `${conversationId}:${deviceId}`;
    if (!this.sessionKeys.has(key)) {
      this.sessionKeys.set(key, []);
    }
    const sessionKey: SessionKey = {
      id: randomUUID(),
      conversationId,
      deviceId,
      keyIndex,
      publicKey,
      createdAt: new Date()
    };
    this.sessionKeys.get(key)!.push(sessionKey);
  }

  async getLatestSessionKey(conversationId: string, deviceId: string): Promise<SessionKey | undefined> {
    const key = `${conversationId}:${deviceId}`;
    const keys = this.sessionKeys.get(key);
    if (!keys || keys.length === 0) return undefined;
    return keys.sort((a, b) => b.keyIndex - a.keyIndex)[0];
  }

  // Health check
  async getStats(): Promise<{ users: number; devices: number; messages: number; sth: number }> {
    return {
      users: this.users.size,
      devices: this.devices.size,
      messages: this.messages.size,
      sth: this.sthRecords.size
    };
  }
}

// Use PostgreSQL storage in production, memory storage for development
import { dbStorage } from "./db-storage";
export const storage = process.env.DATABASE_URL ? dbStorage : new MemStorage();

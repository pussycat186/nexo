import { type User, type InsertUser, type Device, type InsertDevice, type Conversation, type InsertConversation, type Message, type InsertMessage } from "@shared/schema";
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

  // Conversations
  getConversation(id: string): Promise<Conversation | undefined>;
  getConversationsByUserId(userId: string): Promise<Conversation[]>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  getOrCreateDirectConversation(userId1: string, userId2: string): Promise<Conversation>;

  // Messages
  getMessagesByConversationId(conversationId: string, since?: number): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  deleteMessage(id: string): Promise<boolean>;

  // Participants
  addParticipant(conversationId: string, userId: string): Promise<void>;
  getParticipants(conversationId: string): Promise<string[]>;
  isParticipant(conversationId: string, userId: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private devices: Map<string, Device> = new Map();
  private conversations: Map<string, Conversation> = new Map();
  private messages: Map<string, Message> = new Map();
  private participants: Map<string, Set<string>> = new Map();

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
      createdAt: new Date() 
    };
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

  async getConversation(id: string): Promise<Conversation | undefined> {
    return this.conversations.get(id);
  }

  async getConversationsByUserId(userId: string): Promise<Conversation[]> {
    const userConversations: Conversation[] = [];
    for (const [convId, participants] of this.participants.entries()) {
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
      ...conversation, 
      id, 
      createdAt: new Date() 
    };
    this.conversations.set(id, newConversation);
    this.participants.set(id, new Set());
    return newConversation;
  }

  async getOrCreateDirectConversation(userId1: string, userId2: string): Promise<Conversation> {
    // Check if conversation already exists
    for (const [convId, participants] of this.participants.entries()) {
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
    const newMessage: Message = { ...message, id };
    this.messages.set(id, newMessage);
    return newMessage;
  }

  async deleteMessage(id: string): Promise<boolean> {
    const message = this.messages.get(id);
    if (!message) return false;
    
    // Mark as deleted instead of actually deleting
    message.deleted = true;
    message.cipher = "";
    message.ad = { ...message.ad, type: "delete" };
    return true;
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
}

export const storage = new MemStorage();

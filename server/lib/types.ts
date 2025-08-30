import { z } from 'zod';

// Auth schemas
export const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

// Message schemas
export const MessageSchema = z.object({
  roomId: z.string(),
  content: z.string().optional(),
  cipher: z.string().optional(),
  sig: z.string().optional()
});

// Room schemas
export const CreateRoomSchema = z.object({
  kind: z.enum(['dm', 'group', 'channel']),
  name: z.string().optional(),
  members: z.array(z.string()).optional()
});

// Device schemas
export const DeviceSchema = z.object({
  id: z.string(),
  publicKey: z.string()
});

// Key exchange schemas
export const KeyExchangeSchema = z.object({
  deviceId: z.string(),
  ephemeralPublicKey: z.string()
});

// Types
export type User = {
  id: string;
  email: string;
  pass_hash: string | null;
  created_at: number;
};

export type Device = {
  id: string;
  user_id: string;
  pubkey: string;
  created_at: number;
};

export type Room = {
  id: string;
  kind: 'dm' | 'group' | 'channel';
  name: string | null;
  created_at: number;
};

export type Message = {
  id: string;
  room_id: string;
  sender: string;
  cipher: Buffer | null;
  sig: string | null;
  ts: number;
  hash: string;
};

export type Membership = {
  user_id: string;
  room_id: string;
  role: string;
  joined_at: number;
};
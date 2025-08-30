import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { storage } from "./storage";
import { insertUserSchema, insertDeviceSchema, insertMessageSchema } from "@shared/schema";

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";
const JWT_ISSUER = "nexo";

// Challenge store for device registration
const challenges = new Map<string, { nonce: string; exp: number }>();

// WebSocket connections by conversation
const wsConnections = new Map<string, Set<WebSocket>>();

// Simple STH chain implementation
class STHChain {
  private idx = 0;
  private root = Buffer.alloc(32);

  append(leaf: Buffer): { idx: number; root: Buffer } {
    this.idx++;
    const hash = crypto.createHash('sha256');
    hash.update(this.root);
    hash.update(leaf);
    this.root = hash.digest();
    return { idx: this.idx, root: this.root };
  }
}

const sthChain = new STHChain();

function generateTokens(deviceId: string, handle: string) {
  const access = jwt.sign(
    { sub: deviceId, hdl: handle, iss: JWT_ISSUER },
    JWT_SECRET,
    { expiresIn: '15m' }
  );
  const refresh = crypto.randomBytes(32).toString('base64url');
  return { access, refresh };
}

function verifyToken(token: string) {
  try {
    return jwt.verify(token, JWT_SECRET, { issuer: JWT_ISSUER }) as any;
  } catch {
    return null;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // WebSocket server
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws, req) => {
    const url = new URL(req.url!, `http://${req.headers.host}`);
    const convId = url.searchParams.get('conv_id');
    const token = url.searchParams.get('token');

    if (!convId || !token) {
      ws.close(4400, 'Missing parameters');
      return;
    }

    const payload = verifyToken(token);
    if (!payload) {
      ws.close(4401, 'Invalid token');
      return;
    }

    // Add to conversation room
    if (!wsConnections.has(convId)) {
      wsConnections.set(convId, new Set());
    }
    wsConnections.get(convId)!.add(ws);

    ws.on('message', async (data) => {
      try {
        const envelope = JSON.parse(data.toString());
        
        // Add STH index
        const { idx } = sthChain.append(Buffer.from(data.toString()));
        envelope.sth_index = idx;

        // Store message
        await storage.createMessage({
          conversationId: envelope.conv_id,
          senderDeviceId: payload.sub,
          cipher: envelope.cipher?.c || "",
          ad: envelope.ad || {},
          timestamp: Math.floor(Date.now() / 1000),
          sthIndex: idx
        });

        // Broadcast to all clients in conversation
        const connections = wsConnections.get(convId);
        if (connections) {
          const message = JSON.stringify(envelope);
          connections.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(message);
            }
          });
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });

    ws.on('close', () => {
      const connections = wsConnections.get(convId);
      if (connections) {
        connections.delete(ws);
        if (connections.size === 0) {
          wsConnections.delete(convId);
        }
      }
    });
  });

  // Auth routes
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { handle, device_id, ed25519_pub } = req.body;
      
      if (!handle || !ed25519_pub) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const deviceId = device_id || crypto.randomUUID();
      
      // Create or get user
      let user = await storage.getUserByHandle(handle.toLowerCase());
      if (!user) {
        user = await storage.createUser({ handle: handle.toLowerCase() });
      }

      // Store device
      await storage.createDevice({
        id: deviceId,
        userId: user.id,
        ed25519Pub: ed25519_pub,
        x25519Pub: null
      });

      // Generate challenge
      const nonce = crypto.randomBytes(32).toString('base64url');
      const exp = Math.floor(Date.now() / 1000) + 300; // 5 minutes
      challenges.set(deviceId, { nonce, exp });

      res.json({ nonce, exp });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ error: 'Registration failed' });
    }
  });

  app.post('/api/auth/verify', async (req, res) => {
    try {
      const { device_id, signature } = req.body;
      
      const challenge = challenges.get(device_id);
      if (!challenge || challenge.exp < Math.floor(Date.now() / 1000)) {
        return res.status(401).json({ error: 'Challenge expired' });
      }

      const device = await storage.getDevice(device_id);
      if (!device) {
        return res.status(401).json({ error: 'Device not found' });
      }

      // In a real implementation, verify the Ed25519 signature here
      // For now, we'll assume the signature is valid

      const user = await storage.getUser(device.userId);
      if (!user) {
        return res.status(401).json({ error: 'User not found' });
      }

      const tokens = generateTokens(device_id, user.handle);
      challenges.delete(device_id);

      res.json(tokens);
    } catch (error) {
      console.error('Verification error:', error);
      res.status(500).json({ error: 'Verification failed' });
    }
  });

  // Conversation routes
  app.post('/api/conversations', async (req, res) => {
    try {
      const auth = req.headers.authorization;
      if (!auth?.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing token' });
      }

      const payload = verifyToken(auth.substring(7));
      if (!payload) {
        return res.status(401).json({ error: 'Invalid token' });
      }

      const { peer_handle } = req.body;
      if (!peer_handle) {
        return res.status(400).json({ error: 'Missing peer handle' });
      }

      const device = await storage.getDevice(payload.sub);
      const user = await storage.getUser(device!.userId);
      const peer = await storage.getUserByHandle(peer_handle.toLowerCase());

      if (!peer) {
        return res.status(404).json({ error: 'Peer not found' });
      }

      const conversation = await storage.getOrCreateDirectConversation(user!.id, peer.id);

      // Get X25519 public keys for both users
      const userDevices = await storage.getDevicesByUserId(user!.id);
      const peerDevices = await storage.getDevicesByUserId(peer.id);

      res.json({
        conv_id: conversation.id,
        me_x25519: userDevices[0]?.x25519Pub,
        peer_x25519: peerDevices[0]?.x25519Pub
      });
    } catch (error) {
      console.error('Conversation creation error:', error);
      res.status(500).json({ error: 'Failed to create conversation' });
    }
  });

  app.get('/api/conversations', async (req, res) => {
    try {
      const auth = req.headers.authorization;
      if (!auth?.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing token' });
      }

      const payload = verifyToken(auth.substring(7));
      if (!payload) {
        return res.status(401).json({ error: 'Invalid token' });
      }

      const device = await storage.getDevice(payload.sub);
      const conversations = await storage.getConversationsByUserId(device!.userId);

      // Get conversation details with participants
      const conversationsWithDetails = await Promise.all(
        conversations.map(async (conv) => {
          const participants = await storage.getParticipants(conv.id);
          const otherParticipants = participants.filter(p => p !== device!.userId);
          const peerUser = otherParticipants[0] ? await storage.getUser(otherParticipants[0]) : null;
          
          const recentMessages = await storage.getMessagesByConversationId(conv.id);
          const lastMessage = recentMessages[recentMessages.length - 1];

          return {
            ...conv,
            peer_handle: peerUser?.handle,
            last_message_time: lastMessage ? new Date(lastMessage.timestamp * 1000) : conv.createdAt,
            last_message_preview: lastMessage ? '[Encrypted message]' : 'No messages yet'
          };
        })
      );

      res.json({ conversations: conversationsWithDetails });
    } catch (error) {
      console.error('Get conversations error:', error);
      res.status(500).json({ error: 'Failed to get conversations' });
    }
  });

  // Message routes
  app.get('/api/messages/:convId', async (req, res) => {
    try {
      const auth = req.headers.authorization;
      if (!auth?.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing token' });
      }

      const payload = verifyToken(auth.substring(7));
      if (!payload) {
        return res.status(401).json({ error: 'Invalid token' });
      }

      const { convId } = req.params;
      const since = req.query.since ? parseInt(req.query.since as string) : undefined;

      const device = await storage.getDevice(payload.sub);
      const isParticipant = await storage.isParticipant(convId, device!.userId);

      if (!isParticipant) {
        return res.status(403).json({ error: 'Not a participant' });
      }

      const messages = await storage.getMessagesByConversationId(convId, since);

      res.json({
        items: messages.map(msg => ({
          msg_id: msg.id,
          conv_id: msg.conversationId,
          sender_device: msg.senderDeviceId,
          cipher: msg.cipher,
          ad: msg.ad,
          ts: msg.timestamp,
          sth_index: msg.sthIndex
        }))
      });
    } catch (error) {
      console.error('Get messages error:', error);
      res.status(500).json({ error: 'Failed to get messages' });
    }
  });

  app.get('/api/devices/x25519_pub', async (req, res) => {
    try {
      const auth = req.headers.authorization;
      if (!auth?.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing token' });
      }

      const payload = verifyToken(auth.substring(7));
      if (!payload) {
        return res.status(401).json({ error: 'Invalid token' });
      }

      const device = await storage.getDevice(payload.sub);
      if (!device) {
        return res.status(404).json({ error: 'Device not found' });
      }

      res.json({ x25519_pub_b64: device.x25519Pub });
    } catch (error) {
      console.error('Get X25519 key error:', error);
      res.status(500).json({ error: 'Failed to get key' });
    }
  });

  app.get('/api/health', async (req, res) => {
    const userCount = (await Promise.resolve(Array.from((storage as any).users.values()))).length;
    res.json({
      status: 'healthy',
      timestamp: Math.floor(Date.now() / 1000),
      users_count: userCount,
      sth_count: sthChain['idx']
    });
  });

  return httpServer;
}

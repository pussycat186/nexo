import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import jwt from "jsonwebtoken";
import { storage } from "./storage";
import { 
  verifyEd25519Signature, 
  generateChallenge, 
  generateSecureToken,
  STHChain
} from "./crypto";

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";
const JWT_ISSUER = "nexo";
const ACCESS_TTL_MIN = 15;
const REFRESH_TTL_DAYS = 7;

// Challenge store for device registration
const challenges = new Map<string, { nonce: string; exp: number }>();

// WebSocket connections by conversation
const wsConnections = new Map<string, Map<string, WebSocket>>();

// Message acknowledgment tracking
const pendingAcks = new Map<string, { messageId: string; timestamp: number }>();

// STH chain instance
const sthChain = new STHChain();

// Session key rotation tracking
const messageCounters = new Map<string, number>();

// Cached stats for health endpoint (to avoid DB roundtrips)
let cachedStats = {
  users_count: 0,
  sth_count: 0,
  lastUpdate: 0
};

// Initialize stats on startup
async function initializeStats() {
  try {
    const stats = await storage.getStats();
    cachedStats.users_count = stats.users;
    cachedStats.sth_count = stats.sth;
    cachedStats.lastUpdate = Date.now();
  } catch (error) {
    console.error('Failed to initialize stats:', error);
  }
}

// Update stats cache when needed
function updateStatsCache(type: 'user' | 'sth', delta: number = 1) {
  if (type === 'user') {
    cachedStats.users_count += delta;
  } else if (type === 'sth') {
    cachedStats.sth_count += delta;
  }
  cachedStats.lastUpdate = Date.now();
}

function generateTokens(deviceId: string, handle: string) {
  const access = jwt.sign(
    { sub: deviceId, hdl: handle, iss: JWT_ISSUER },
    JWT_SECRET,
    { expiresIn: `${ACCESS_TTL_MIN}m` }
  );
  return { access };
}

function verifyToken(token: string) {
  try {
    return jwt.verify(token, JWT_SECRET, { issuer: JWT_ISSUER }) as any;
  } catch {
    return null;
  }
}

// Cleanup expired messages and tokens periodically
setInterval(async () => {
  await storage.deleteExpiredMessages();
  await storage.deleteExpiredRefreshTokens();
}, 60000); // Every minute

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // Initialize cached stats for health endpoint
  initializeStats();

  // WebSocket server with ACK support
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

    const deviceId = payload.sub;

    // Add to conversation room with device tracking
    if (!wsConnections.has(convId)) {
      wsConnections.set(convId, new Map());
    }
    wsConnections.get(convId)!.set(deviceId, ws);

    // Send any pending messages on reconnect
    storage.getMessagesByConversationId(convId).then(messages => {
      const recentMessages = messages.filter(m => 
        m.timestamp > Date.now() - 60000 // Last minute
      );
      recentMessages.forEach(msg => {
        ws.send(JSON.stringify({
          type: 'message',
          ...msg
        }));
      });
    });

    ws.on('message', async (data) => {
      try {
        const envelope = JSON.parse(data.toString());
        
        // Handle different message types
        if (envelope.type === 'ack') {
          // Handle acknowledgment
          const ack = await storage.createMessageAck({
            messageId: envelope.messageId,
            deviceId,
            ackType: envelope.ackType || 'delivered'
          });

          // Broadcast ACK to other devices
          const connections = wsConnections.get(convId);
          if (connections) {
            connections.forEach((client, clientDeviceId) => {
              if (clientDeviceId !== deviceId && client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                  type: 'ack',
                  messageId: envelope.messageId,
                  deviceId,
                  ackType: envelope.ackType
                }));
              }
            });
          }
          return;
        }

        // Check for idempotency - prevent duplicates
        if (envelope.msg_id && pendingAcks.has(envelope.msg_id)) {
          // Send ACK for duplicate
          ws.send(JSON.stringify({
            type: 'ack',
            messageId: envelope.msg_id,
            status: 'duplicate'
          }));
          return;
        }

        // Track message for idempotency
        if (envelope.msg_id) {
          pendingAcks.set(envelope.msg_id, {
            messageId: envelope.msg_id,
            timestamp: Date.now()
          });
          
          // Clean up old pending ACKs after 30 seconds
          setTimeout(() => pendingAcks.delete(envelope.msg_id), 30000);
        }

        // Add STH index
        const leafData = Buffer.from(JSON.stringify(envelope));
        const { idx, root, leaf } = sthChain.append(leafData);
        envelope.sth_index = idx;

        // Track message count for key rotation
        const counterKey = `${convId}:${deviceId}`;
        const currentCount = (messageCounters.get(counterKey) || 0) + 1;
        messageCounters.set(counterKey, currentCount);

        // Check if key rotation needed (every 20 messages)
        if (currentCount % 20 === 0) {
          envelope.rotate_key = true;
          // Store new session key if provided
          if (envelope.new_session_key) {
            await storage.createSessionKey(
              convId,
              deviceId,
              Math.floor(currentCount / 20),
              envelope.new_session_key
            );
          }
        }

        // Store message
        const message = await storage.createMessage({
          conversationId: envelope.conv_id || convId,
          senderDeviceId: deviceId,
          cipher: envelope.cipher?.c || envelope.cipher || "",
          nonce: envelope.cipher?.n || "",
          ad: envelope.ad || {},
          timestamp: Date.now(),
          sthIndex: idx,
          ttl: envelope.ttl
        });

        // Store STH record
        await storage.createSTH(idx, root.toString('base64'), leaf.toString('base64'));
        updateStatsCache('sth', 1); // Update cached STH count

        // Send ACK to sender
        ws.send(JSON.stringify({
          type: 'ack',
          messageId: message.id,
          status: 'delivered',
          sth_index: idx
        }));

        // Broadcast to all clients in conversation (including sender for confirmation)
        const connections = wsConnections.get(convId);
        if (connections) {
          const broadcastMessage = JSON.stringify({
            type: 'message',
            ...message,
            sth_index: idx,
            rotate_key: envelope.rotate_key
          });
          
          connections.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(broadcastMessage);
            }
          });
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
        ws.send(JSON.stringify({
          type: 'error',
          error: 'Failed to process message'
        }));
      }
    });

    ws.on('close', () => {
      const connections = wsConnections.get(convId);
      if (connections) {
        connections.delete(deviceId);
        if (connections.size === 0) {
          wsConnections.delete(convId);
        }
      }
    });
  });

  // Auth routes with Ed25519 signature verification
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { handle, device_id, ed25519_pub, x25519_pub, device_name } = req.body;
      
      if (!handle || !ed25519_pub) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const deviceId = device_id || crypto.randomUUID();
      
      // Create or get user
      let user = await storage.getUserByHandle(handle.toLowerCase());
      if (!user) {
        user = await storage.createUser({ handle: handle.toLowerCase() });
        updateStatsCache('user', 1); // Update cached user count
      }

      // Check if device already exists
      let device = await storage.getDevice(deviceId);
      if (!device) {
        // Store device with both keys
        device = await storage.createDevice({
          id: deviceId,
          userId: user.id,
          ed25519Pub: ed25519_pub,
          x25519Pub: x25519_pub,
          name: device_name,
          revoked: false
        });
      } else {
        // Update existing device
        device = await storage.updateDevice(deviceId, {
          ed25519Pub: ed25519_pub,
          x25519Pub: x25519_pub,
          name: device_name,
          lastSeen: new Date()
        });
      }

      // Generate challenge
      const nonce = generateChallenge();
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
      if (!device || device.revoked) {
        return res.status(401).json({ error: 'Device not found or revoked' });
      }

      // Verify Ed25519 signature
      const isValid = verifyEd25519Signature(challenge.nonce, signature, device.ed25519Pub);
      if (!isValid) {
        return res.status(401).json({ error: 'Invalid signature' });
      }

      const user = await storage.getUser(device.userId);
      if (!user) {
        return res.status(401).json({ error: 'User not found' });
      }

      // Generate tokens
      const tokens = generateTokens(device_id, user.handle);
      
      // Generate and store refresh token
      const refreshToken = generateSecureToken();
      await storage.createRefreshToken({
        token: refreshToken,
        deviceId: device_id,
        expiresAt: new Date(Date.now() + REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000)
      });

      // Update device last seen
      await storage.updateDevice(device_id, { lastSeen: new Date() });

      challenges.delete(device_id);

      res.json({ ...tokens, refresh: refreshToken });
    } catch (error) {
      console.error('Verification error:', error);
      res.status(500).json({ error: 'Verification failed' });
    }
  });

  // Refresh token endpoint
  app.post('/api/auth/refresh', async (req, res) => {
    try {
      const { refresh_token } = req.body;
      
      if (!refresh_token) {
        return res.status(400).json({ error: 'Missing refresh token' });
      }

      const storedToken = await storage.getRefreshToken(refresh_token);
      if (!storedToken || storedToken.expiresAt < new Date()) {
        return res.status(401).json({ error: 'Invalid or expired refresh token' });
      }

      const device = await storage.getDevice(storedToken.deviceId);
      if (!device || device.revoked) {
        return res.status(401).json({ error: 'Device revoked' });
      }

      const user = await storage.getUser(device.userId);
      if (!user) {
        return res.status(401).json({ error: 'User not found' });
      }

      // Delete old refresh token
      await storage.deleteRefreshToken(refresh_token);

      // Generate new tokens
      const tokens = generateTokens(storedToken.deviceId, user.handle);
      
      // Generate new refresh token
      const newRefreshToken = generateSecureToken();
      await storage.createRefreshToken({
        token: newRefreshToken,
        deviceId: storedToken.deviceId,
        expiresAt: new Date(Date.now() + REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000)
      });

      res.json({ ...tokens, refresh: newRefreshToken });
    } catch (error) {
      console.error('Refresh error:', error);
      res.status(500).json({ error: 'Refresh failed' });
    }
  });

  // Device management
  app.get('/api/devices', async (req, res) => {
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

      const devices = await storage.getDevicesByUserId(device.userId);
      
      res.json({
        devices: devices.map(d => ({
          id: d.id,
          name: d.name || 'Unnamed Device',
          lastSeen: d.lastSeen,
          current: d.id === payload.sub,
          revoked: d.revoked
        }))
      });
    } catch (error) {
      console.error('Get devices error:', error);
      res.status(500).json({ error: 'Failed to get devices' });
    }
  });

  app.delete('/api/devices/:deviceId', async (req, res) => {
    try {
      const auth = req.headers.authorization;
      if (!auth?.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing token' });
      }

      const payload = verifyToken(auth.substring(7));
      if (!payload) {
        return res.status(401).json({ error: 'Invalid token' });
      }

      const { deviceId } = req.params;
      
      // Can't revoke current device
      if (deviceId === payload.sub) {
        return res.status(400).json({ error: 'Cannot revoke current device' });
      }

      const currentDevice = await storage.getDevice(payload.sub);
      const targetDevice = await storage.getDevice(deviceId);
      
      if (!currentDevice || !targetDevice) {
        return res.status(404).json({ error: 'Device not found' });
      }

      // Verify same user
      if (currentDevice.userId !== targetDevice.userId) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      await storage.revokeDevice(deviceId);
      
      res.json({ success: true });
    } catch (error) {
      console.error('Revoke device error:', error);
      res.status(500).json({ error: 'Failed to revoke device' });
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

          // Get unread count based on ACKs
          let unreadCount = 0;
          if (lastMessage) {
            const acks = await storage.getMessageAcks(lastMessage.id);
            const hasRead = acks.some(a => a.deviceId === payload.sub && a.ackType === 'read');
            if (!hasRead && lastMessage.senderDeviceId !== payload.sub) {
              unreadCount = 1;
            }
          }

          return {
            ...conv,
            peer_handle: peerUser?.handle,
            last_message_time: lastMessage ? new Date(lastMessage.timestamp) : conv.createdAt,
            last_message_preview: lastMessage ? '[Encrypted message]' : 'No messages yet',
            unread_count: unreadCount
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

      // Filter out messages deleted for this user
      const visibleMessages = messages.filter(msg => 
        !msg.deletedForMe?.includes(device!.userId)
      );

      // Get ACKs for messages
      const messagesWithAcks = await Promise.all(
        visibleMessages.map(async (msg) => {
          const acks = await storage.getMessageAcks(msg.id);
          return {
            msg_id: msg.id,
            conv_id: msg.conversationId,
            sender_device: msg.senderDeviceId,
            cipher: msg.cipher,
            nonce: msg.nonce,
            ad: msg.ad,
            ts: msg.timestamp,
            sth_index: msg.sthIndex,
            edited: msg.edited,
            edited_at: msg.editedAt,
            deleted: msg.deleted,
            ttl: msg.ttl,
            expires_at: msg.expiresAt,
            acks: acks.map(a => ({
              device_id: a.deviceId,
              type: a.ackType,
              timestamp: a.timestamp
            }))
          };
        })
      );

      res.json({ items: messagesWithAcks });
    } catch (error) {
      console.error('Get messages error:', error);
      res.status(500).json({ error: 'Failed to get messages' });
    }
  });

  // Edit message endpoint
  app.patch('/api/messages/:messageId', async (req, res) => {
    try {
      const auth = req.headers.authorization;
      if (!auth?.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing token' });
      }

      const payload = verifyToken(auth.substring(7));
      if (!payload) {
        return res.status(401).json({ error: 'Invalid token' });
      }

      const { messageId } = req.params;
      const { cipher, nonce } = req.body;

      const message = await storage.getMessagesByConversationId('').then(msgs => 
        msgs.find(m => m.id === messageId)
      );

      if (!message) {
        return res.status(404).json({ error: 'Message not found' });
      }

      // Check if sender
      if (message.senderDeviceId !== payload.sub) {
        return res.status(403).json({ error: 'Can only edit own messages' });
      }

      // Check 15-minute edit window
      const editWindow = 15 * 60 * 1000; // 15 minutes
      if (Date.now() - message.timestamp > editWindow) {
        return res.status(400).json({ error: 'Edit window expired' });
      }

      // Update message
      const updated = await storage.updateMessage(messageId, {
        cipher,
        nonce,
        edited: true,
        editedAt: new Date()
      });

      // Broadcast edit to WebSocket clients
      const connections = wsConnections.get(message.conversationId);
      if (connections) {
        connections.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
              type: 'edit',
              message_id: messageId,
              cipher,
              nonce,
              edited: true,
              edited_at: updated?.editedAt
            }));
          }
        });
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Edit message error:', error);
      res.status(500).json({ error: 'Failed to edit message' });
    }
  });

  // Delete message endpoints
  app.delete('/api/messages/:messageId', async (req, res) => {
    try {
      const auth = req.headers.authorization;
      if (!auth?.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing token' });
      }

      const payload = verifyToken(auth.substring(7));
      if (!payload) {
        return res.status(401).json({ error: 'Invalid token' });
      }

      const { messageId } = req.params;
      const { for_everyone, signature } = req.body;

      const device = await storage.getDevice(payload.sub);

      if (for_everyone) {
        // Delete for everyone - requires signature
        if (!signature) {
          return res.status(400).json({ error: 'Signature required for delete for everyone' });
        }

        // Verify signature
        const isValid = verifyEd25519Signature(
          `delete:${messageId}`,
          signature,
          device!.ed25519Pub
        );

        if (!isValid) {
          return res.status(401).json({ error: 'Invalid signature' });
        }

        await storage.deleteMessage(messageId);

        // Broadcast deletion
        const message = await storage.getMessagesByConversationId('').then(msgs => 
          msgs.find(m => m.id === messageId)
        );

        if (message) {
          const connections = wsConnections.get(message.conversationId);
          if (connections) {
            connections.forEach((client) => {
              if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                  type: 'delete',
                  message_id: messageId,
                  for_everyone: true
                }));
              }
            });
          }
        }
      } else {
        // Delete for me only
        await storage.deleteMessageForUser(messageId, device!.userId);
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Delete message error:', error);
      res.status(500).json({ error: 'Failed to delete message' });
    }
  });

  // Health endpoint (optimized for <200ms response)
  app.get('/api/health', async (req, res) => {
    const start = Date.now();
    
    // Use cached stats to avoid DB roundtrip
    res.json({
      ok: true,
      status: 'healthy',
      db: process.env.DATABASE_URL ? 'postgresql' : 'memory',
      uptime: process.uptime(),
      version: '1.0.0',
      timestamp: Math.floor(Date.now() / 1000),
      users_count: cachedStats.users_count,
      sth_count: cachedStats.sth_count,
      response_time_ms: Date.now() - start
    });
  });

  // STH endpoints
  app.get('/api/sth', async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
      const sthList = await storage.getSTHList(limit);
      
      res.json({
        items: sthList,
        current_index: sthChain.getIndex(),
        current_root: sthChain.getRoot().toString('base64')
      });
    } catch (error) {
      console.error('Get STH list error:', error);
      res.status(500).json({ error: 'Failed to get STH list' });
    }
  });

  app.get('/api/sth/:index/proof', async (req, res) => {
    try {
      const index = parseInt(req.params.index);
      const sth = await storage.getSTHByIndex(index);
      
      if (!sth) {
        return res.status(404).json({ error: 'STH not found' });
      }

      // Generate inclusion proof
      const proof = sthChain.getInclusionProof(index);
      
      res.json({
        index,
        leaf: sth.leaf,
        root: sth.root,
        proof
      });
    } catch (error) {
      console.error('Get STH proof error:', error);
      res.status(500).json({ error: 'Failed to get STH proof' });
    }
  });

  return httpServer;
}
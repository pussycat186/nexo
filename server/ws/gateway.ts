import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import jwt from 'jsonwebtoken';
import { db, statements } from '../lib/db';
import { hash, generateMessageId } from '../lib/crypto/keys';
import { appendLeaf } from '../lib/crypto/merkle';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const JWT_ISSUER = process.env.JWT_ISSUER || 'nexo';

interface WSClient {
  ws: WebSocket;
  userId: string;
  deviceId: string;
  rooms: Set<string>;
}

const clients = new Map<string, WSClient>();
const roomClients = new Map<string, Set<string>>();

export function setupWebSocketServer(server: Server) {
  const wss = new WebSocketServer({ 
    server,
    path: '/ws'
  });

  wss.on('connection', (ws, req) => {
    const url = new URL(req.url!, `http://${req.headers.host}`);
    const token = url.searchParams.get('token');

    if (!token) {
      ws.close(1008, 'Missing token');
      return;
    }

    // Verify JWT
    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET, { issuer: JWT_ISSUER });
    } catch (error) {
      ws.close(1008, 'Invalid token');
      return;
    }

    const clientId = `${decoded.uid}-${decoded.did}`;
    const client: WSClient = {
      ws,
      userId: decoded.uid,
      deviceId: decoded.did,
      rooms: new Set()
    };

    clients.set(clientId, client);

    // Send init event
    ws.send(JSON.stringify({
      type: 'init',
      userId: client.userId,
      deviceId: client.deviceId
    }));

    // Handle messages
    ws.on('message', async (data) => {
      try {
        const msg = JSON.parse(data.toString());
        
        switch (msg.type) {
          case 'join':
            handleJoin(client, msg.roomId);
            break;
            
          case 'leave':
            handleLeave(client, msg.roomId);
            break;
            
          case 'message':
            await handleMessage(client, msg);
            break;
            
          case 'key_exchange':
            handleKeyExchange(client, msg);
            break;
            
          case 'presence':
            handlePresence(client, msg);
            break;
            
          default:
            ws.send(JSON.stringify({ error: 'Unknown message type' }));
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
        ws.send(JSON.stringify({ error: 'Invalid message' }));
      }
    });

    // Handle disconnect
    ws.on('close', () => {
      // Remove from all rooms
      for (const roomId of client.rooms) {
        const roomSet = roomClients.get(roomId);
        if (roomSet) {
          roomSet.delete(clientId);
          if (roomSet.size === 0) {
            roomClients.delete(roomId);
          }
        }
      }
      clients.delete(clientId);
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  });

  return wss;
}

function handleJoin(client: WSClient, roomId: string) {
  // Check membership
  const membership = db.prepare(`
    SELECT * FROM memberships 
    WHERE user_id = ? AND room_id = ?
  `).get(client.userId, roomId);

  if (!membership) {
    client.ws.send(JSON.stringify({ 
      error: 'Not a member of this room' 
    }));
    return;
  }

  // Add to room
  client.rooms.add(roomId);
  
  if (!roomClients.has(roomId)) {
    roomClients.set(roomId, new Set());
  }
  roomClients.get(roomId)!.add(`${client.userId}-${client.deviceId}`);

  // Send confirmation
  client.ws.send(JSON.stringify({
    type: 'joined',
    roomId
  }));

  // Broadcast presence
  broadcastToRoom(roomId, {
    type: 'presence',
    userId: client.userId,
    status: 'online'
  }, client);
}

function handleLeave(client: WSClient, roomId: string) {
  client.rooms.delete(roomId);
  
  const roomSet = roomClients.get(roomId);
  if (roomSet) {
    roomSet.delete(`${client.userId}-${client.deviceId}`);
    if (roomSet.size === 0) {
      roomClients.delete(roomId);
    }
  }

  // Send confirmation
  client.ws.send(JSON.stringify({
    type: 'left',
    roomId
  }));

  // Broadcast presence
  broadcastToRoom(roomId, {
    type: 'presence',
    userId: client.userId,
    status: 'offline'
  }, client);
}

async function handleMessage(client: WSClient, msg: any) {
  const { roomId, content, cipher, sig } = msg;

  if (!roomId || (!content && !cipher)) {
    client.ws.send(JSON.stringify({ 
      error: 'Invalid message' 
    }));
    return;
  }

  // Check membership
  if (!client.rooms.has(roomId)) {
    client.ws.send(JSON.stringify({ 
      error: 'Not in room' 
    }));
    return;
  }

  // Generate message ID and hash
  const messageId = generateMessageId();
  const messageData = JSON.stringify({
    id: messageId,
    roomId,
    sender: client.userId,
    content: content || '',
    cipher: cipher || '',
    sig: sig || '',
    timestamp: Date.now()
  });
  const messageHash = hash(messageData);

  // Store message
  try {
    statements.createMessage.run(
      messageId,
      roomId,
      client.userId,
      cipher ? Buffer.from(cipher, 'hex') : null,
      sig || null,
      messageHash
    );

    // Append to Merkle tree
    appendLeaf(messageHash);

    // Send ACK to sender
    client.ws.send(JSON.stringify({
      type: 'ack',
      messageId,
      hash: messageHash
    }));

    // Broadcast to room members
    broadcastToRoom(roomId, {
      type: 'message',
      id: messageId,
      roomId,
      sender: client.userId,
      content,
      cipher,
      sig,
      hash: messageHash,
      timestamp: Date.now()
    }, client);

  } catch (error) {
    console.error('Message storage error:', error);
    client.ws.send(JSON.stringify({ 
      error: 'Failed to store message' 
    }));
  }
}

function handleKeyExchange(client: WSClient, msg: any) {
  const { roomId, targetUserId, ephemeralPublicKey } = msg;

  if (!roomId || !targetUserId || !ephemeralPublicKey) {
    client.ws.send(JSON.stringify({ 
      error: 'Invalid key exchange' 
    }));
    return;
  }

  // Find target client
  const targetClient = Array.from(clients.values()).find(
    c => c.userId === targetUserId && c.rooms.has(roomId)
  );

  if (!targetClient) {
    client.ws.send(JSON.stringify({ 
      error: 'Target user not online' 
    }));
    return;
  }

  // Forward key exchange
  targetClient.ws.send(JSON.stringify({
    type: 'key_exchange',
    fromUserId: client.userId,
    fromDeviceId: client.deviceId,
    ephemeralPublicKey,
    roomId
  }));
}

function handlePresence(client: WSClient, msg: any) {
  const { roomId, status } = msg;

  if (!roomId || !status) {
    return;
  }

  broadcastToRoom(roomId, {
    type: 'presence',
    userId: client.userId,
    status
  }, client);
}

function broadcastToRoom(roomId: string, message: any, exclude?: WSClient) {
  const roomSet = roomClients.get(roomId);
  if (!roomSet) return;

  const messageStr = JSON.stringify(message);
  
  for (const clientId of roomSet) {
    const client = clients.get(clientId);
    if (client && client !== exclude && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(messageStr);
    }
  }
}
import { Router } from 'express';
import jwt from 'jsonwebtoken';
import argon2 from 'argon2';
import { v4 as uuidv4 } from 'uuid';
import { db, statements } from '../lib/db';
import { RegisterSchema, LoginSchema, type User } from '../lib/types';
import { generateSigningKeypair, generateEncryptionKeypair, generateDeviceId } from '../lib/crypto/keys';

const router = Router();

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const JWT_ISSUER = process.env.JWT_ISSUER || 'nexo';

// Register endpoint
router.post('/register', async (req, res) => {
  try {
    const data = RegisterSchema.parse(req.body);
    
    // Check if user exists
    const existing = statements.getUserByEmail.get(data.email) as User | undefined;
    if (existing) {
      return res.status(400).json({ error: 'Email already registered' });
    }
    
    // Hash password
    const passHash = await argon2.hash(data.password);
    
    // Create user
    const userId = uuidv4();
    statements.createUser.run(userId, data.email, passHash);
    
    // Generate device keys
    const deviceId = generateDeviceId();
    const signingKeys = generateSigningKeypair();
    const encryptionKeys = generateEncryptionKeypair();
    
    // Create device
    statements.createDevice.run(deviceId, userId, signingKeys.publicKey);
    
    // Generate JWT
    const token = jwt.sign(
      { 
        sub: userId, 
        uid: userId,
        did: deviceId,
        email: data.email 
      },
      JWT_SECRET,
      { 
        expiresIn: '15m',
        issuer: JWT_ISSUER 
      }
    );
    
    // Set cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000 // 15 minutes
    });
    
    res.json({
      token,
      userId,
      deviceId,
      keys: {
        signing: signingKeys,
        encryption: encryptionKeys
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(400).json({ error: 'Invalid request' });
  }
});

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const data = LoginSchema.parse(req.body);
    
    // Get user
    const user = statements.getUserByEmail.get(data.email) as User | undefined;
    if (!user || !user.pass_hash) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Verify password
    const valid = await argon2.verify(user.pass_hash, data.password);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Get or create device
    const devices = statements.getDevicesByUser.all(user.id) as any[];
    let deviceId: string;
    
    if (devices.length > 0) {
      deviceId = devices[0].id;
    } else {
      // Create new device
      deviceId = generateDeviceId();
      const signingKeys = generateSigningKeypair();
      statements.createDevice.run(deviceId, user.id, signingKeys.publicKey);
    }
    
    // Generate JWT
    const token = jwt.sign(
      { 
        sub: user.id, 
        uid: user.id,
        did: deviceId,
        email: data.email 
      },
      JWT_SECRET,
      { 
        expiresIn: '15m',
        issuer: JWT_ISSUER 
      }
    );
    
    // Set cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000 // 15 minutes
    });
    
    res.json({
      token,
      userId: user.id,
      deviceId
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(400).json({ error: 'Invalid request' });
  }
});

// Logout endpoint
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ success: true });
});

// Verify token endpoint
router.get('/verify', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '') || req.cookies?.token;
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET, { issuer: JWT_ISSUER });
    res.json({ valid: true, decoded });
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

export default router;
import { Router } from 'express';
import { db, statements } from '../lib/db';
import { computeCurrentRoot, getProof } from '../lib/crypto/merkle';
import { signSTH, verifySTH, getCosignerPublicKeys } from '../lib/crypto/cosign';

const router = Router();

// Get latest STH endpoint
router.get('/sth', (req, res) => {
  try {
    // Compute current Merkle root
    const root = computeCurrentRoot();
    const timestamp = Math.floor(Date.now() / 1000);
    
    // Sign STH with cosigners
    const sth = signSTH(root, timestamp);
    
    // Store STH in database
    statements.createSTH.run(
      sth.root,
      sth.signatures.sig1 || null,
      sth.signatures.sig2 || null,
      sth.signatures.sig3 || null
    );
    
    // Get cosigner public keys for verification
    const cosignerKeys = getCosignerPublicKeys();
    
    res.json({
      sth,
      cosignerKeys,
      valid: verifySTH(sth)
    });
  } catch (error) {
    console.error('STH error:', error);
    res.status(500).json({ error: 'Failed to generate STH' });
  }
});

// Get proof for a message
router.get('/proof', (req, res) => {
  try {
    const { messageId, messageHash } = req.query;
    
    if (!messageId && !messageHash) {
      return res.status(400).json({ error: 'messageId or messageHash required' });
    }
    
    let hash: string | undefined;
    
    if (messageId) {
      // Get message by ID
      const message = db.prepare('SELECT hash FROM messages WHERE id = ?').get(messageId as string) as any;
      if (!message) {
        return res.status(404).json({ error: 'Message not found' });
      }
      hash = message.hash;
    } else {
      hash = messageHash as string;
    }
    
    // Get proof
    const proof = getProof(hash!);
    if (!proof) {
      return res.status(404).json({ error: 'Proof not found' });
    }
    
    // Get latest STH
    const latestSTH = statements.getLatestSTH.get() as any;
    
    res.json({
      messageHash: hash,
      proof: proof.path,
      root: proof.root,
      sth: latestSTH ? {
        root: latestSTH.root,
        timestamp: latestSTH.ts,
        signatures: {
          sig1: latestSTH.sig1,
          sig2: latestSTH.sig2,
          sig3: latestSTH.sig3
        }
      } : null
    });
  } catch (error) {
    console.error('Proof error:', error);
    res.status(500).json({ error: 'Failed to generate proof' });
  }
});

// Get STH history
router.get('/sth/history', (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    
    const history = db.prepare(`
      SELECT * FROM sth 
      ORDER BY id DESC 
      LIMIT ?
    `).all(limit) as any[];
    
    res.json({
      history: history.map(sth => ({
        id: sth.id,
        root: sth.root,
        timestamp: sth.ts,
        signatures: {
          sig1: sth.sig1,
          sig2: sth.sig2,
          sig3: sth.sig3
        }
      }))
    });
  } catch (error) {
    console.error('STH history error:', error);
    res.status(500).json({ error: 'Failed to get STH history' });
  }
});

// Verify proof endpoint (for client convenience)
router.post('/verify', (req, res) => {
  try {
    const { messageHash, proof, root, index } = req.body;
    
    if (!messageHash || !proof || !root || index === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Import verify function
    const { verifyProof } = require('../lib/crypto/merkle');
    
    const valid = verifyProof(messageHash, proof, root, index);
    
    res.json({ valid });
  } catch (error) {
    console.error('Verify error:', error);
    res.status(500).json({ error: 'Failed to verify proof' });
  }
});

export default router;
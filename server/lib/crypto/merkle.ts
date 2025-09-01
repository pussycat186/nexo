import { sha256 } from '@noble/hashes/sha2.js';
import { db, statements } from '../db';

// Compute SHA-256 hash
function computeHash(data: Buffer | string): string {
  const dataBuffer = typeof data === 'string' ? Buffer.from(data) : data;
  return Buffer.from(sha256(dataBuffer)).toString('hex');
}

// Compute parent hash from two children
function computeParentHash(left: string, right: string): string {
  const combined = Buffer.concat([
    Buffer.from(left, 'hex'),
    Buffer.from(right, 'hex')
  ]);
  return computeHash(combined);
}

// Merkle tree node
interface MerkleNode {
  id: number;
  hash: string;
  left_child: number | null;
  right_child: number | null;
}

// Append a new leaf to the Merkle tree
export function appendLeaf(leafHash: string): number {
  const result = statements.createMerkleNode.run(leafHash, null, null);
  return result.lastInsertRowid as number;
}

// Build Merkle tree and return root
export function buildMerkleTree(leafHashes: string[]): string {
  if (leafHashes.length === 0) {
    return computeHash('empty');
  }
  
  if (leafHashes.length === 1) {
    return leafHashes[0];
  }
  
  // Build tree level by level
  let currentLevel = [...leafHashes];
  
  while (currentLevel.length > 1) {
    const nextLevel: string[] = [];
    
    for (let i = 0; i < currentLevel.length; i += 2) {
      const left = currentLevel[i];
      const right = i + 1 < currentLevel.length ? currentLevel[i + 1] : left;
      const parent = computeParentHash(left, right);
      nextLevel.push(parent);
    }
    
    currentLevel = nextLevel;
  }
  
  return currentLevel[0];
}

// Get proof path for a message
export function getProof(messageHash: string): {
  path: string[];
  root: string;
} | null {
  // Get all message hashes in order
  const allMessages = db.prepare(`
    SELECT hash FROM messages ORDER BY ts, id
  `).all() as { hash: string }[];
  
  const index = allMessages.findIndex(m => m.hash === messageHash);
  if (index === -1) {
    return null;
  }
  
  const leafHashes = allMessages.map(m => m.hash);
  const path: string[] = [];
  
  // Build proof path
  let currentLevel = [...leafHashes];
  let currentIndex = index;
  
  while (currentLevel.length > 1) {
    const nextLevel: string[] = [];
    
    for (let i = 0; i < currentLevel.length; i += 2) {
      const left = currentLevel[i];
      const right = i + 1 < currentLevel.length ? currentLevel[i + 1] : left;
      
      // If this pair contains our target, add sibling to path
      if (i === currentIndex || i + 1 === currentIndex) {
        const sibling = i === currentIndex ? right : left;
        path.push(sibling);
        currentIndex = Math.floor(i / 2);
      }
      
      const parent = computeParentHash(left, right);
      nextLevel.push(parent);
    }
    
    currentLevel = nextLevel;
  }
  
  return {
    path,
    root: currentLevel[0]
  };
}

// Verify proof
export function verifyProof(
  leafHash: string,
  path: string[],
  root: string,
  index: number
): boolean {
  let currentHash = leafHash;
  let currentIndex = index;
  
  for (const siblingHash of path) {
    const isLeft = currentIndex % 2 === 0;
    currentHash = isLeft
      ? computeParentHash(currentHash, siblingHash)
      : computeParentHash(siblingHash, currentHash);
    currentIndex = Math.floor(currentIndex / 2);
  }
  
  return currentHash === root;
}

// Compute current Merkle root from all messages
export function computeCurrentRoot(): string {
  const allMessages = db.prepare(`
    SELECT hash FROM messages ORDER BY ts, id
  `).all() as { hash: string }[];
  
  const hashes = allMessages.map(m => m.hash);
  return buildMerkleTree(hashes);
}
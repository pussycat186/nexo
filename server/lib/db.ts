import Database from 'better-sqlite3';
import { existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';

// Ensure data directory exists
const dbPath = './data/nexo.db';
const dataDir = dirname(dbPath);
if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true });
}

// Initialize database
export const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Run migrations
function runMigrations() {
  // Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      pass_hash TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
  `);

  // Devices table
  db.exec(`
    CREATE TABLE IF NOT EXISTS devices (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      pubkey TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // Rooms table
  db.exec(`
    CREATE TABLE IF NOT EXISTS rooms (
      id TEXT PRIMARY KEY,
      kind TEXT NOT NULL CHECK(kind IN ('dm', 'group', 'channel')),
      name TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
  `);

  // Memberships table
  db.exec(`
    CREATE TABLE IF NOT EXISTS memberships (
      user_id TEXT NOT NULL,
      room_id TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'member',
      joined_at INTEGER NOT NULL DEFAULT (unixepoch()),
      PRIMARY KEY (user_id, room_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
    );
  `);

  // Messages table
  db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      room_id TEXT NOT NULL,
      sender TEXT NOT NULL,
      cipher BLOB,
      sig TEXT,
      ts INTEGER NOT NULL DEFAULT (unixepoch()),
      hash TEXT UNIQUE NOT NULL,
      FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
      FOREIGN KEY (sender) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // Merkle nodes table
  db.exec(`
    CREATE TABLE IF NOT EXISTS merkle_nodes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hash TEXT NOT NULL,
      left_child INTEGER,
      right_child INTEGER,
      FOREIGN KEY (left_child) REFERENCES merkle_nodes(id),
      FOREIGN KEY (right_child) REFERENCES merkle_nodes(id)
    );
  `);

  // STH (Signed Tree Head) table
  db.exec(`
    CREATE TABLE IF NOT EXISTS sth (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      root TEXT NOT NULL,
      sig1 TEXT,
      sig2 TEXT,
      sig3 TEXT,
      ts INTEGER NOT NULL DEFAULT (unixepoch())
    );
  `);

  // Create indexes
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_messages_room ON messages(room_id);
    CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender);
    CREATE INDEX IF NOT EXISTS idx_messages_hash ON messages(hash);
    CREATE INDEX IF NOT EXISTS idx_devices_user ON devices(user_id);
    CREATE INDEX IF NOT EXISTS idx_memberships_room ON memberships(room_id);
  `);
}

// Run migrations on startup
runMigrations();

// Prepared statements
export const statements = {
  // User operations
  createUser: db.prepare(`
    INSERT INTO users (id, email, pass_hash) 
    VALUES (?, ?, ?)
  `),
  
  getUserByEmail: db.prepare(`
    SELECT * FROM users WHERE email = ?
  `),
  
  getUserById: db.prepare(`
    SELECT * FROM users WHERE id = ?
  `),
  
  // Device operations
  createDevice: db.prepare(`
    INSERT INTO devices (id, user_id, pubkey)
    VALUES (?, ?, ?)
  `),
  
  getDevicesByUser: db.prepare(`
    SELECT * FROM devices WHERE user_id = ?
  `),
  
  // Room operations
  createRoom: db.prepare(`
    INSERT INTO rooms (id, kind, name)
    VALUES (?, ?, ?)
  `),
  
  getRoomById: db.prepare(`
    SELECT * FROM rooms WHERE id = ?
  `),
  
  // Membership operations
  addMembership: db.prepare(`
    INSERT INTO memberships (user_id, room_id, role)
    VALUES (?, ?, ?)
  `),
  
  getRoomMembers: db.prepare(`
    SELECT u.*, m.role, m.joined_at
    FROM users u
    JOIN memberships m ON u.id = m.user_id
    WHERE m.room_id = ?
  `),
  
  getUserRooms: db.prepare(`
    SELECT r.*, m.role, m.joined_at
    FROM rooms r
    JOIN memberships m ON r.id = m.room_id
    WHERE m.user_id = ?
  `),
  
  // Message operations
  createMessage: db.prepare(`
    INSERT INTO messages (id, room_id, sender, cipher, sig, hash)
    VALUES (?, ?, ?, ?, ?, ?)
  `),
  
  getRoomMessages: db.prepare(`
    SELECT * FROM messages 
    WHERE room_id = ? 
    ORDER BY ts DESC 
    LIMIT ?
  `),
  
  getMessageByHash: db.prepare(`
    SELECT * FROM messages WHERE hash = ?
  `),
  
  // Merkle operations
  createMerkleNode: db.prepare(`
    INSERT INTO merkle_nodes (hash, left_child, right_child)
    VALUES (?, ?, ?)
  `),
  
  getLatestMerkleRoot: db.prepare(`
    SELECT * FROM merkle_nodes 
    WHERE left_child IS NULL AND right_child IS NULL
    ORDER BY id DESC LIMIT 1
  `),
  
  // STH operations
  createSTH: db.prepare(`
    INSERT INTO sth (root, sig1, sig2, sig3)
    VALUES (?, ?, ?, ?)
  `),
  
  getLatestSTH: db.prepare(`
    SELECT * FROM sth ORDER BY id DESC LIMIT 1
  `)
};

export default db;
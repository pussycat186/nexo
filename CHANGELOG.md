# Nexo v2 - Changelog

## [2.0.0] - 2024-01-28

### Added

#### Authentication & Security
- ✅ Passwordless authentication via Ed25519 challenge-response
- ✅ JWT access tokens (15min TTL) with refresh token rotation (7 days)
- ✅ Device management with list and revoke functionality
- ✅ Multi-device support per user

#### End-to-End Encryption
- ✅ X25519 ECDH key exchange
- ✅ XChaCha20-Poly1305 AEAD encryption
- ✅ HKDF-SHA256 key derivation
- ✅ Session key rotation every 20 messages (window ratchet)
- ✅ Client-side encryption with libsodium-wrappers

#### Messaging Features
- ✅ WebSocket real-time delivery with ACK mechanism
- ✅ Idempotency to prevent duplicate messages on reconnect
- ✅ Delete for everyone (signed tombstone)
- ✅ Delete for me (local deletion)
- ✅ 15-minute edit window with "edited" flag
- ✅ Read receipts (ON by default, toggleable)
- ✅ TTL presets (1h/1d/7d/custom, OFF by default)
- ✅ Message delivery and read status indicators

#### Data Integrity
- ✅ Monotonic STH (Signed Tree Head) chain
- ✅ STH index on every message
- ✅ STH list endpoint for audit
- ✅ Client-side inclusion proof verification

#### Infrastructure
- ✅ PostgreSQL database with Drizzle ORM
- ✅ Optimized /health endpoint (<200ms response)
- ✅ Automatic cleanup of expired messages and tokens
- ✅ WebSocket connection management with auto-reconnect

#### User Interface
- ✅ Modern dark theme with Nexo branding
- ✅ Responsive chat interface
- ✅ Conversation sidebar with search
- ✅ Security information modal
- ✅ Device management UI
- ✅ Settings with data export

### Changed
- Migrated from mock crypto to real libsodium implementation
- Upgraded from in-memory storage to PostgreSQL
- Enhanced WebSocket protocol with message types
- Improved error handling and recovery

### Security
- Implemented proper Ed25519 signature verification
- Added CORS and security headers configuration
- Rate limiting recommendations
- Zero-knowledge architecture

### Technical Stack
- Frontend: React + TypeScript + Vite + TailwindCSS
- Backend: Express + TypeScript + PostgreSQL
- Crypto: libsodium-wrappers + tweetnacl
- Database: Drizzle ORM + Neon PostgreSQL
- Real-time: WebSocket with acknowledgments

## [1.0.0] - 2024-01-15

### Initial Release
- Basic messaging functionality
- Mock encryption implementation
- In-memory storage
- Simple authentication

---

## Acceptance Criteria Status

### ✅ AUTH & DEVICES
- [x] Passwordless register/login via Ed25519 challenge-response
- [x] Refresh flow works
- [x] Device list + revoke

### ✅ DM FLOW  
- [x] WebSocket delivery with ACK + idempotency (no duplicates after reconnect)
- [x] Delete for everyone (signed tombstone) and delete for me
- [x] Edit window: 15 minutes with an "edited" flag

### ✅ CRYPTO
- [x] Client-side X25519 Diffie–Hellman + HKDF
- [x] XChaCha20-Poly1305 payload
- [x] Rotate session key every 20 messages (window ratchet)
- [x] Server stores ciphertext only and attaches monotonic STH index

### ✅ UX / SETTINGS
- [x] Read receipts ON by default (toggleable)
- [x] TTL presets (1h/1d/7d/custom) OFF by default

### ✅ AUDIT / HEALTH
- [x] /health returns {status,timestamp,users_count,sth_count} in <200ms
- [x] STH list endpoint + client-side verification

### ✅ PERSISTENCE
- [x] PostgreSQL schema (users, devices, conversations, messages, sth) with migrations

### ✅ DELIVERABLES
- [x] RUNBOOK.md (deploy/secrets)
- [x] SECURITY.md (CORS, rate-limit, headers)
- [x] CHANGELOG.md with release tag

## Release Notes

This release represents a complete implementation of a production-ready end-to-end encrypted messaging system with all specified security features, real-time capabilities, and enterprise-grade infrastructure.
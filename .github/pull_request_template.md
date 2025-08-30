## Description
<!-- Provide a brief description of the changes in this PR -->

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update
- [ ] Performance improvement
- [ ] Security fix

## Acceptance Evidence Checklist

### Core Functionality
- [ ] **HEALTH < 200ms**: Health endpoint responds under 200ms after warm-up
- [ ] **SQLite Default**: Application uses SQLite when DATABASE_URL is unset
- [ ] **Auth Flow**: Device registration and authentication working

### Security & Messaging
- [ ] **Revoke → 401 + WS4401**: Token revocation returns 401 on API and 4401 on WebSocket
- [ ] **WS No-Dup**: WebSocket idempotency working (DB count = 1 for duplicate message IDs)
- [ ] **Edit/Delete Rules**: 15-minute edit window enforced, delete requires signature

### Cryptography
- [ ] **Key Rotation @20**: Session keys rotate after 20 messages
- [ ] **E2EE Working**: X25519 + XChaCha20-Poly1305 encryption functional

### Features
- [ ] **TTL Purge**: Messages with TTL are properly deleted after expiry
- [ ] **STH Verify**: STH chain verification working with inclusion proofs
- [ ] **Read Receipts**: Default ON, can be toggled OFF

## Testing
- [ ] Unit tests pass
- [ ] E2E tests pass
- [ ] Manual testing completed
- [ ] No console errors

## Screenshots/Recordings
<!-- If applicable, add screenshots or recordings of the changes -->

## Additional Notes
<!-- Any other information that reviewers should know -->
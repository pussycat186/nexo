# Nexo v2 - Security Configuration

## Security Headers

### Required Headers
```javascript
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Content-Security-Policy', "default-src 'self'; ws-src 'self' wss:;");
  next();
});
```

## CORS Configuration

### Production Settings
```javascript
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['https://nexo.app'],
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
```

## Rate Limiting

### API Endpoints
```javascript
import rateLimit from 'express-rate-limit';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: 'Too many authentication attempts'
});

// Apply to auth routes
app.use('/api/auth', authLimiter);

const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: 'Too many requests'
});

// Apply to all API routes
app.use('/api', apiLimiter);
```

### WebSocket Connections
- Max 5 concurrent connections per user
- Max 100 messages per minute per connection
- Automatic disconnect on rate limit exceeded

## Authentication & Authorization

### JWT Configuration
- Algorithm: HS256
- Access token TTL: 15 minutes
- Refresh token TTL: 7 days
- Token rotation on refresh

### Device Authentication
- Ed25519 signature verification
- Challenge-response with 5-minute TTL
- Device revocation support

## Cryptography

### End-to-End Encryption
- Key Exchange: X25519 ECDH
- Encryption: XChaCha20-Poly1305 AEAD
- Key Derivation: HKDF-SHA256
- Session Key Rotation: Every 20 messages

### Data at Rest
- Database: TLS encrypted connections
- Ciphertext only storage
- No plaintext message retention

## Input Validation

### Message Handling
- Max message size: 10KB
- Sanitize metadata fields
- Validate STH index integrity
- Verify signature on delete operations

### User Input
- Handle validation: alphanumeric + underscore only
- Device ID: UUID format validation
- Timestamp validation: reject future timestamps

## Vulnerability Mitigation

### SQL Injection
- Parameterized queries via Drizzle ORM
- Input validation on all user data
- No raw SQL execution

### XSS Prevention
- Content-Type: application/json only
- No HTML rendering server-side
- Client-side sanitization

### CSRF Protection
- SameSite cookie attribute
- Custom header validation
- Origin verification

## Audit Logging

### Events to Log
- Authentication attempts
- Device registration/revocation
- Message deletion (for everyone)
- Failed signature verifications
- Rate limit violations

### Log Format
```json
{
  "timestamp": "2024-01-01T00:00:00Z",
  "event": "auth_failed",
  "device_id": "uuid",
  "ip": "192.168.1.1",
  "details": "Invalid signature"
}
```

## Security Testing

### Regular Audits
- [ ] Monthly dependency updates
- [ ] Quarterly penetration testing
- [ ] Annual security review

### Automated Checks
- npm audit on CI/CD
- OWASP dependency check
- Static code analysis

## Incident Response

### Detection
- Monitor /health endpoint
- Alert on repeated auth failures
- Track STH chain anomalies

### Response Plan
1. Identify and isolate affected systems
2. Preserve logs and evidence
3. Revoke compromised devices
4. Notify affected users
5. Deploy patches
6. Post-incident review

## Compliance

### GDPR
- Data export via settings
- Right to deletion support
- Minimal data retention
- Explicit consent for processing

### Security Standards
- OWASP Top 10 compliance
- E2EE best practices
- Zero-knowledge architecture
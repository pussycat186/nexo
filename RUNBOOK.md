# Nexo v2 - Production Runbook

## Deployment Guide

### Prerequisites
- Node.js 20+ and npm 10+
- PostgreSQL 14+ database
- SSL certificate for HTTPS

### Environment Variables
```bash
# Required
DATABASE_URL=postgresql://user:pass@host:5432/nexo_db
JWT_SECRET=your-secure-random-secret-min-32-chars
JWT_ISSUER=nexo

# Optional
ACCESS_TTL_MIN=15
REFRESH_TTL_DAYS=7
```

### Deployment Steps

1. **Clone and Install**
```bash
git clone <repository>
cd nexo-v2
npm install
```

2. **Database Setup**
```bash
npm run db:push --force
```

3. **Build Application**
```bash
npm run build
```

4. **Start Production Server**
```bash
NODE_ENV=production npm start
```

### Health Monitoring
- Health endpoint: `GET /api/health`
- Expected response time: <200ms
- Monitors: users_count, sth_count, database connectivity

### Backup Strategy
- Database: Daily automated PostgreSQL backups
- STH chain: Export via `/api/sth` endpoint weekly
- User data: GDPR-compliant export via settings

### Troubleshooting

#### WebSocket Connection Issues
- Check firewall allows WS/WSS on port 5000
- Verify SSL certificate is valid
- Check client network allows WebSocket connections

#### Database Connection Errors
- Verify DATABASE_URL is correct
- Check PostgreSQL is running and accessible
- Ensure connection pool limits aren't exceeded

#### High Memory Usage
- Monitor STH chain size (cleanup old entries monthly)
- Check for WebSocket connection leaks
- Review message retention policies

### Security Checklist
- [ ] JWT_SECRET is unique and secure
- [ ] HTTPS/WSS enforced in production
- [ ] Rate limiting configured
- [ ] CORS properly configured
- [ ] Database credentials secured
- [ ] Regular security updates applied

### Performance Tuning
- Database: Index on messages.conversation_id, messages.timestamp
- WebSocket: Limit concurrent connections per user
- STH: Implement periodic cleanup for entries >30 days

### Rollback Procedure
1. Stop application
2. Restore database from backup
3. Deploy previous version
4. Verify health endpoint
5. Monitor for 15 minutes
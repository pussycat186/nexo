# Nexo v2 - Production Runbook

## Starting with SQLite (Default)

When `DATABASE_URL` is not set, the application automatically uses SQLite:

```bash
# No DATABASE_URL needed - SQLite is the default
npm run dev  # Development
npm start    # Production
```

The SQLite database will be automatically created at `./data/nexo.db` on first run.

## Environment Variables

```bash
# Server Configuration
PORT=5000                    # Server port (default: 5000)
JWT_SECRET=change_me         # JWT signing secret (required)
JWT_ISSUER=nexo             # JWT issuer identifier (default: nexo)

# Optional - PostgreSQL (if not set, uses SQLite)
DATABASE_URL=postgresql://user:pass@host:5432/nexo_db
```

## Health Check

Monitor the health endpoint to ensure the service is running:

```bash
curl -s -w "\\nResponse time: %{time_total}s\\n" http://localhost:5000/api/health
```

Expected:
- Status: 200 OK
- Response time: < 200ms (after warm-up)
- Response includes: `status`, `timestamp`, `users_count`, `sth_count`

## Troubleshooting

### Health Response Time > 200ms

**Symptoms**: Health endpoint takes longer than 200ms to respond

**Solutions**:
1. **Cold start**: First few requests may be slow. Warm up with 3-5 requests.
2. **Database latency**: Check database connection and performance.
3. **Server load**: Monitor CPU and memory usage.
4. **Network**: Verify no proxy or firewall delays.

**Debug steps**:
```bash
# Measure exact timing
for i in {1..5}; do
  curl -s -o /dev/null -w "Attempt $i: %{time_total}s\\n" http://localhost:5000/api/health
  sleep 1
done
```

### WebSocket Duplicate Messages

**Symptoms**: Same message appears multiple times in the database

**Root causes**:
1. Missing ACK from server causing client retry
2. Network interruption during message send
3. Client reconnection without tracking sent messages

**Solutions**:
1. **Verify idempotency**: Check that message IDs are unique UUIDs
2. **Check ACK mechanism**: Ensure server sends ACK for each message
3. **Database constraint**: Verify unique constraint on message_id column

**Debug steps**:
```bash
# Check for duplicates in database
sqlite3 ./data/nexo.db "SELECT message_id, COUNT(*) FROM messages GROUP BY message_id HAVING COUNT(*) > 1;"

# Monitor WebSocket traffic
wscat -c ws://localhost:5000/ws -H "Authorization: Bearer <token>"
```

### Common Issues

#### Port Already in Use
```bash
# Find process using port 5000
lsof -i :5000
# Kill the process
kill -9 <PID>
```

#### SQLite Database Locked
```bash
# Check for lock file
ls -la ./data/nexo.db*
# Remove stale lock if present
rm ./data/nexo.db-journal
```

#### JWT Token Expired
- Tokens expire after 1 hour
- Client should refresh before expiry
- Check JWT_SECRET is consistent across restarts

#### WebSocket 4401 Unauthorized
- Verify JWT token is valid
- Check Authorization header format: `Bearer <token>`
- Ensure token hasn't expired

## Performance Tuning

### SQLite Optimization
```sql
-- Run these pragmas for better performance
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA cache_size = -2000;  -- 2MB cache
PRAGMA temp_store = MEMORY;
```

### PostgreSQL Migration
If you need to migrate from SQLite to PostgreSQL:
1. Export data from SQLite
2. Set DATABASE_URL environment variable
3. Run `npm run db:push`
4. Import data to PostgreSQL

## Monitoring Checklist

- [ ] Health endpoint responds < 200ms
- [ ] No duplicate messages in database
- [ ] WebSocket connections stable
- [ ] STH chain index incrementing
- [ ] JWT tokens refreshing properly
- [ ] Rate limiting working (100 req/min)

## Security Reminders

- Always use HTTPS in production
- Rotate JWT_SECRET periodically
- Monitor failed authentication attempts
- Review device registrations regularly
- Check STH chain for anomalies
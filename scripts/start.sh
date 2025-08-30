#!/usr/bin/env bash
set -euo pipefail

# 0) Kill any lingering servers (idempotent)
pkill -f "server/index.ts|dist/index.js|node|tsx" 2>/dev/null || true

# 1) Environment defaults
export PORT="${PORT:-5000}"
export NODE_ENV="${NODE_ENV:-production}"

# 2) Build if possible (no-fail)
(npm run build || pnpm build || yarn build || true) >/dev/null 2>&1 || true

# 3) Start exactly ONE server, log to file
rm -f server.pid server.log
(
  node dist/index.js \
  || npx --yes tsx server/index.ts
) > server.log 2>&1 &
echo $! > server.pid

# 4) Readiness check
ok=0
for i in {1..60}; do
  if curl -sf "http://localhost:${PORT}/api/health" >/dev/null; then ok=1; break; fi
  sleep 1
done

if [ "$ok" != "1" ]; then
  echo "[start] ❌ Server failed readiness. Tail log:" >&2
  tail -n 200 server.log >&2
  exit 1
fi

# 5) DB banner hint
if grep -Ei "Using SQLite database at .*data/nexo\.db" server.log >/dev/null; then
  echo "[start] ✅ SQLite fallback detected"
else
  if grep -Ei "Using PostgreSQL database" server.log >/dev/null; then
    echo "[start] ✅ PostgreSQL detected"
  else
    echo "[start] ⚠️  No DB banner detected; ensure the server prints a DB mode line."
  fi
fi

echo "[start] ✅ Server healthy on :${PORT} (pid $(cat server.pid))."
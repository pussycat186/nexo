#!/usr/bin/env bash
set -euo pipefail

export PORT="${PORT:-5000}"

# warmup 3 requests (ignore output)
for i in 1 2 3; do curl -s "http://localhost:${PORT}/api/health" >/dev/null || true; done

# measure 5 times
for i in 1 2 3 4 5; do
  T=$(curl -s -w "%{http_code} %{time_total}" -o /dev/null "http://localhost:${PORT}/api/health")
  code=$(awk '{print $1}' <<<"$T")
  sec=$(awk '{print $2}' <<<"$T")
  ms=$(awk -v t="$sec" 'BEGIN{printf "%.0f", t*1000}')
  echo "sample $i: code=$code time=${ms}ms"
  if [ "$code" != "200" ]; then echo "❌ health not 200" && exit 1; fi
done
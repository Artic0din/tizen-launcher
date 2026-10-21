#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="${1:-$ROOT/evidence}"
PORT="${2:-9222}"
mkdir -p "$OUT"

if ! command -v google-chrome >/dev/null 2>&1 && ! command -v chromium >/dev/null 2>&1; then
  echo "Chrome/Chromium required" >&2
  exit 1
fi
CHROME="$(command -v google-chrome || command -v chromium)"

USER_DATA="$(mktemp -d)"
"$CHROME" --headless=new --disable-gpu --no-sandbox \
  --remote-debugging-port="$PORT" \
  --user-data-dir="$USER_DATA" \
  --window-size=1920,1080 \
  "about:blank" &
CPID=$!
cleanup() { kill "$CPID" 2>/dev/null || true; rm -rf "$USER_DATA" 2>/dev/null || true; }
trap cleanup EXIT

for _ in $(seq 1 30); do
  if curl -sf "http://127.0.0.1:$PORT/json/version" >/dev/null; then
    break
  fi
  sleep 0.2
done
node "$ROOT/test/cdp-drive.js" "$PORT" "$OUT"
echo "Evidence written to $OUT"

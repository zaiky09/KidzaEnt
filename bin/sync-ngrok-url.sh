#!/usr/bin/env bash
# Reads the current ngrok public URL from its local API (default :4040) and
# writes MPESA_CALLBACK_URL=<url>/api/payments/callback into .env.
#
# Usage:
#   bin/sync-ngrok-url.sh              # update repo-root .env
#   bin/sync-ngrok-url.sh path/to/.env # update a specific env file
#
# Prereq: ngrok must already be running (e.g. `ngrok http 4000`).

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${1:-$REPO_ROOT/.env}"
NGROK_API="${NGROK_API:-http://localhost:4040/api/tunnels}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "❌ .env file not found: $ENV_FILE" >&2
  exit 1
fi

# Pull the first HTTPS tunnel from ngrok's local API.
PUBLIC_URL=$(curl -sf "$NGROK_API" 2>/dev/null \
  | python3 -c 'import json,sys
try:
  data = json.load(sys.stdin)
except Exception:
  sys.exit(1)
for t in data.get("tunnels", []):
  if t.get("proto") == "https":
    print(t["public_url"]); break
' 2>/dev/null) || true

if [[ -z "${PUBLIC_URL:-}" ]]; then
  echo "❌ Could not read public URL from $NGROK_API" >&2
  echo "   Is ngrok running? Start it with:  ngrok http 4000" >&2
  exit 1
fi

NEW_CALLBACK="${PUBLIC_URL}/api/payments/callback"
OLD_CALLBACK=$(grep -E '^MPESA_CALLBACK_URL=' "$ENV_FILE" | head -1 | cut -d= -f2- || true)

if [[ "$OLD_CALLBACK" == "$NEW_CALLBACK" ]]; then
  echo "✓ MPESA_CALLBACK_URL already up-to-date:"
  echo "    $NEW_CALLBACK"
  exit 0
fi

# Replace the line in place. Use a temp file to avoid the sed-in-place portability dance.
TMP=$(mktemp)
trap 'rm -f "$TMP"' EXIT
if grep -qE '^MPESA_CALLBACK_URL=' "$ENV_FILE"; then
  awk -v new="$NEW_CALLBACK" '
    /^MPESA_CALLBACK_URL=/ { print "MPESA_CALLBACK_URL=" new; next }
    { print }
  ' "$ENV_FILE" > "$TMP"
else
  cp "$ENV_FILE" "$TMP"
  printf '\nMPESA_CALLBACK_URL=%s\n' "$NEW_CALLBACK" >> "$TMP"
fi
mv "$TMP" "$ENV_FILE"
trap - EXIT

echo "✓ Updated MPESA_CALLBACK_URL in $ENV_FILE"
echo "    new: $NEW_CALLBACK"
[[ -n "$OLD_CALLBACK" ]] && echo "    old: $OLD_CALLBACK"
echo
echo "Reminder: restart the backend so dotenv picks up the new value:"
echo "    pkill -f 'node --watch backend/server.js' && npm run dev"

#!/usr/bin/env bash
# Run on production server after deploy — exercises food sponsorship APIs end-to-end.
set -euo pipefail

API="${API_BASE:-http://127.0.0.1:3001/api}"
PASSWORD="${SEED_PASSWORD:-Chellamuthu@2026}"

pass=0
fail=0

ok() { echo "  ✓ $1${2:+ — $2}"; pass=$((pass + 1)); }
bad() { echo "  ✗ $1 — $2"; fail=$((fail + 1)); }

login() {
  curl -sf -X POST "$API/auth/login" \
    -H 'Content-Type: application/json' \
    -d "{\"email\":\"$1\",\"password\":\"$PASSWORD\"}" | jq -r .token
}

echo ""
echo "=== Remote Food Flow Tests ==="
echo "API: $API"
echo ""

if curl -sf "${API%/api}/health" >/dev/null 2>&1; then
  ok "Health check"
else
  bad "Health check" "API not reachable"
  exit 1
fi

ADMIN_TOKEN=$(login admin@chellamuthu.local) || true
WARDEN_TOKEN=$(login warden@chellamuthu.local) || true
DONOR_TOKEN=$(login donor@chellamuthu.local) || true

if [[ -z "${ADMIN_TOKEN:-}" || "$ADMIN_TOKEN" == "null" ]]; then
  bad "Admin login" "Check seed accounts / password"
  exit 1
fi
ok "Admin login"

[[ -n "${WARDEN_TOKEN:-}" && "$WARDEN_TOKEN" != "null" ]] && ok "Warden login" || bad "Warden login" "failed"
[[ -n "${DONOR_TOKEN:-}" && "$DONOR_TOKEN" != "null" ]] && ok "Donor login" || bad "Donor login" "failed"

HOME_ID=$(curl -sf "$API/homes?limit=1" -H "Authorization: Bearer $ADMIN_TOKEN" | jq -r '.[0].id // empty')
WARDEN_HOME_ID=$(curl -sf "$API/auth/me" -H "Authorization: Bearer $WARDEN_TOKEN" | jq -r '.home_id // empty')

if [[ -z "$HOME_ID" ]]; then
  bad "Setup" "No home found — run seed on server"
  exit 1
fi
ok "Loaded home" "$HOME_ID"

if [[ -n "$WARDEN_HOME_ID" && "$WARDEN_HOME_ID" != "null" ]]; then
  ok "Warden home" "$WARDEN_HOME_ID"
  SLOT_HOME_ID="$WARDEN_HOME_ID"
else
  SLOT_HOME_ID="$HOME_ID"
fi

# Pick a booked slot on the warden's home with donor, not yet shared with donor
SLOT_ID=$(curl -sf "$API/food_slots?home_id=$SLOT_HOME_ID&status=BOOKED&limit=50" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq -r '
  [.[] | select(.donor_id != null and .photos_shared_at == null and (.event_media_status == null or .event_media_status == "REJECTED"))][0].id // empty')

if [[ -z "$SLOT_ID" ]]; then
  bad "Find test slot" "No eligible BOOKED slot with donor (without shared media)"
else
  ok "Test slot" "$SLOT_ID"

  SUBMIT=$(curl -s -X POST "$API/food-slots/$SLOT_ID/submit-event-media" \
    -H "Authorization: Bearer $WARDEN_TOKEN" \
    -H 'Content-Type: application/json' \
    -d '{"photos":["https://example.com/test-photo.jpg"],"videos":[],"notes":"Remote flow test"}' 2>/dev/null || echo '{}')
  if echo "$SUBMIT" | jq -e '.success == true' >/dev/null 2>&1; then
    ok "Submit event media"
  else
    bad "Submit event media" "$(echo "$SUBMIT" | jq -r '.error // .message // .')"
  fi

  PENDING=$(curl -sf "$API/food-slots/pending-event-media" -H "Authorization: Bearer $ADMIN_TOKEN" | jq -r '.count // 0')
  if [[ "$PENDING" -ge 1 ]]; then
    ok "Pending queue" "$PENDING item(s)"
  else
    bad "Pending queue" "expected >= 1"
  fi

  APPROVE=$(curl -s -X POST "$API/food-slots/$SLOT_ID/approve-event-media" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H 'Content-Type: application/json' \
    -d '{}' 2>/dev/null || echo '{}')
  if echo "$APPROVE" | jq -e '.success == true' >/dev/null 2>&1; then
    ok "Approve event media"
  else
    bad "Approve event media" "$(echo "$APPROVE" | jq -r '.error // .message // .')"
  fi

  SEND=$(curl -s -X POST "$API/food-slots/$SLOT_ID/send-event-media" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H 'Content-Type: application/json' \
    -d '{"customMessage":"Dear donor, remote flow test message with photos attached."}' 2>/dev/null || echo '{}')
  if echo "$SEND" | jq -e '.success == true' >/dev/null 2>&1; then
    ok "Send event media to donor"
  else
    bad "Send event media" "$(echo "$SEND" | jq -r '.error // .message // .')"
  fi

  DUP=$(curl -s -X POST "$API/food-slots/$SLOT_ID/send-event-media" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H 'Content-Type: application/json' \
    -d '{}' 2>/dev/null || echo '{}')
  if echo "$DUP" | jq -r '.error // .message // empty' | grep -qi 'already sent'; then
    ok "Duplicate send blocked"
  else
    bad "Duplicate send blocked" "$(echo "$DUP" | jq -c .)"
  fi
fi

RECEIPT=$(curl -sf -X POST "$API/food-slots/send-receipt-thankyou" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{\"slot_ids\":[\"${SLOT_ID:-00000000-0000-0000-0000-000000000000}\"],\"force\":true}" 2>/dev/null || echo '{}')
if echo "$RECEIPT" | jq -e '.count >= 0' >/dev/null 2>&1; then
  ok "Receipt/thank-you endpoint" "count=$(echo "$RECEIPT" | jq -r '.count')"
else
  bad "Receipt/thank-you" "$(echo "$RECEIPT" | jq -r '.error // .message // .')"
fi

PENDING_ACK=$(curl -sf "$API/food-slots/payment-reminder-eligible?homeId=$SLOT_HOME_ID" -H "Authorization: Bearer $ADMIN_TOKEN" 2>/dev/null || echo '{}')
if echo "$PENDING_ACK" | jq -e '.count >= 0' >/dev/null 2>&1; then
  ok "Payment reminder eligible endpoint" "count=$(echo "$PENDING_ACK" | jq -r '.count')"
else
  bad "Payment reminder eligible" "$(echo "$PENDING_ACK" | jq -c . 2>/dev/null || echo 'failed')"
fi

echo ""
echo "=== Results: $pass passed, $fail failed ==="
echo ""
exit $(( fail > 0 ? 1 : 0 ))

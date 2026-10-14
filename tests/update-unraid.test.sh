#!/bin/bash
set -eu
ROOT=$(cd "$(dirname "$0")/.." && pwd)
FIXTURE=$(mktemp -d)
trap 'rm -rf "$FIXTURE"' EXIT
mkdir -p "$FIXTURE/bin" "$FIXTURE/data"
export DATA_PATH="$FIXTURE/data" LOG="$FIXTURE/commands.log"
printf 'existing-account-and-save\n' > "$DATA_PATH/sentinel"
cat > "$FIXTURE/bin/docker" <<'MOCK'
#!/bin/sh
printf '%s\n' "$*" >> "$LOG"
case "$1" in
 inspect) printf '%s\n' "$DATA_PATH" ;;
 build) [ "${FAIL_STAGE:-}" != build ] ;;
 run) [ "${FAIL_STAGE:-}" != run ] ;;
 *) exit 0 ;;
esac
MOCK
cat > "$FIXTURE/bin/curl" <<'MOCK'
#!/bin/sh
[ "${FAIL_STAGE:-}" != health ] || exit 22
printf '{"ok":true}'
MOCK
printf '#!/bin/sh\nexit 0\n' > "$FIXTURE/bin/sleep"
chmod +x "$FIXTURE/bin/"*
export PATH="$FIXTURE/bin:$PATH"
for stage in success build run health; do
 export FAIL_STAGE="$stage"
 : > "$LOG"
 if sh "$ROOT/deploy/update-unraid.sh" https://pokemon.blfy.cc:9521 > "$FIXTURE/output" 2>&1; then
   [ "$stage" = success ]
 else
   [ "$stage" != success ]
 fi
 [ "$(cat "$DATA_PATH/sentinel")" = existing-account-and-save ]
 case "$stage" in
 success) grep -q 'PUBLIC_ORIGIN=https://pokemon.blfy.cc:9521' "$LOG"; grep -q 'exec pokesurvivor-cn node server/backup.cjs' "$LOG"; ! grep -q '^rm ' "$LOG" ;;
 build) ! grep -q '^stop ' "$LOG" ;;
 run|health) grep -q '^start pokesurvivor-cn$' "$LOG"; grep -q '^rename pokesurvivor-cn-backup-' "$LOG" ;;
 esac
 echo "PASS update script: $stage; persistent data unchanged"
done

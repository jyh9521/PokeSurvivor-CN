#!/bin/sh
# Update a public NAS installation without changing its persistent data mount.
set -eu
ORIGIN="${1:?Usage: update-unraid.sh https://host:port}"
DATA="${DATA_PATH:-/mnt/user/appdata/pokesurvivor-cn/data}"
NAME=pokesurvivor-cn
STAMP=$(date +%Y%m%d-%H%M%S)
BACKUP="$NAME-backup-$STAMP"
IMAGE=pokesurvivor-cn-nas:0.18.0
# Refuse to accidentally use a new empty data directory.
test -d "$DATA"
ACTUAL=$(docker inspect --format '{{range .Mounts}}{{if eq .Destination "/data"}}{{.Source}}{{end}}{{end}}' "$NAME")
if [ "$ACTUAL" != "$DATA" ]; then
  echo "Data mount differs: $ACTUAL. No container changes made."
  exit 1
fi
# Build first: a build failure leaves the running game untouched.
docker build -t "$IMAGE" .
TURN_ENV_FILE="${TURN_ENV_FILE:-$(dirname "$DATA")/turn.env}"
set --
if [ -f "$TURN_ENV_FILE" ]; then
  chmod 600 "$TURN_ENV_FILE"
  set -- --env-file "$TURN_ENV_FILE"
  # Test both usage protection and credential issuance before stopping the old container.
  docker run --rm --cap-drop ALL --security-opt no-new-privileges:true "$@" "$IMAGE" node tools/check-turn-config.cjs
else
  echo 'TURN not configured: direct play remains available; run deploy/setup-cloudflare-turn.sh to enable fallback.'
fi
# New backends must be explicitly drained first. Older releases have no gate.
# Run this inside the old container: no admin cookie/password on the command line.
docker exec "$NAME" node -e 'fetch("http://127.0.0.1:2333/api/health").then(r=>{if(!r.ok)throw Error("Health failed");return r.json()}).then(h=>{if("activeRuns" in h&&(!h.draining||!h.ready)){console.error("Enable maintenance in game settings and wait until ready. No container changes made.");process.exit(2)}}).catch(e=>{console.error(e.message);process.exit(1)})'
# Consistent SQLite backup while the old container is still running.
docker exec "$NAME" node server/backup.cjs "/data/backups/pre-0.18.0-$STAMP.sqlite"
docker stop "$NAME"
docker rename "$NAME" "$BACKUP"
restore_container() {
  docker rm -f "$NAME" >/dev/null 2>&1 || true
  docker rename "$BACKUP" "$NAME"
  docker start "$NAME"
}
if ! docker run -d --name "$NAME" --restart unless-stopped \
  --user 99:100 --cap-drop ALL --security-opt no-new-privileges:true \
  -p 2333:2333 -e PORT=2333 -e PUBLIC_ORIGIN="$ORIGIN" \
  -e TRUST_PROXY=true -e REGISTRATION=true -v "$DATA:/data" \
  --health-cmd 'node -e "fetch(\"http://127.0.0.1:2333/api/health\").then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"' \
  "$@" "$IMAGE"; then
  restore_container
  exit 1
fi
# Verify both startup and the configured external Origin; rollback on failure.
READY=false
for attempt in 1 2 3 4 5 6; do
  if curl --max-time 5 -fsS -H "Origin: $ORIGIN" http://127.0.0.1:2333/api/health; then READY=true; break; fi
  sleep 5
done
if [ "$READY" != true ]; then restore_container; exit 1; fi
printf '\nUpdated. Previous container: %s\nDatabase backup: %s/backups/pre-0.18.0-%s.sqlite\n' "$BACKUP" "$DATA" "$STAMP"
docker logs --tail 30 "$NAME"

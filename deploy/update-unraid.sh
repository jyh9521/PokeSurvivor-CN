#!/bin/sh
# Explicit standalone target; never operate on Compose containers.
set -eu
exec python3 "$(dirname "$0")/update-nas.py" standalone "$@"

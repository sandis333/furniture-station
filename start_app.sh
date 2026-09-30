#!/bin/bash
export DISPLAY=:0
export XAUTHORITY=/home/bsadmin/.Xauthority

PROJECT_DIR=/home/bsadmin/Desktop/furnituras_iznemsanas_stacija
PROFILE_DIR=/tmp/furnituras-iznemsanas-kiosk

if ! ss -tlnp 2>/dev/null | grep -q ':8000'; then
    echo "[start_app] Starting backend..."
    cd "$PROJECT_DIR" || exit 1
    bash ./dev.sh &
    BACKEND_PID=$!
    for i in $(seq 1 30); do
        ss -tlnp 2>/dev/null | grep -q ':8000' && break
        sleep 1
    done
fi

for i in $(seq 1 30); do xrandr &>/dev/null && break; sleep 1; done

rm -rf "$PROFILE_DIR"
chromium --user-data-dir="$PROFILE_DIR" \
         --kiosk \
         --start-fullscreen \
         "http://127.0.0.1:8000" &
CHROMIUM_PID=$!

wait "$CHROMIUM_PID" ${BACKEND_PID:-}

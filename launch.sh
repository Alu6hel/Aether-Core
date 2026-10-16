#!/usr/bin/env bash
set -e

DIR="$(dirname "$(realpath "${BASH_SOURCE[0]}")")"
PORT=8080
PID_FILE="/tmp/aether-core.pid"
LOG_FILE="/tmp/aether-core.log"
URL="http://127.0.0.1:${PORT}"

start_server() {
    if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
        echo "[Aether-Core] Server already running (PID: $(cat "$PID_FILE")) on ${URL}"
    else
        echo "[Aether-Core] Starting local game server on port ${PORT}..."
        nohup node "$DIR/server.js" > "$LOG_FILE" 2>&1 &
        echo $! > "$PID_FILE"
        sleep 0.5
        echo "[Aether-Core] Server online (PID: $(cat "$PID_FILE"))."
    fi
}

stop_server() {
    if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
        echo "[Aether-Core] Stopping server (PID: $(cat "$PID_FILE"))..."
        kill "$(cat "$PID_FILE")" || true
        rm -f "$PID_FILE"
        echo "[Aether-Core] Server stopped."
    else
        echo "[Aether-Core] No server running."
    fi
}

open_browser() {
    echo "[Aether-Core] Opening game at ${URL}..."
    if [ -x "/opt/google/cros-containers/bin/garcon" ]; then
        /opt/google/cros-containers/bin/garcon --client --url "${URL}" >/dev/null 2>&1 || xdg-open "${URL}" || sensible-browser "${URL}" &
    elif command -v garcon-url-handler >/dev/null 2>&1; then
        garcon-url-handler "${URL}" >/dev/null 2>&1 || xdg-open "${URL}" &
    elif command -v xdg-open >/dev/null 2>&1; then
        xdg-open "${URL}" >/dev/null 2>&1 &
    elif command -v sensible-browser >/dev/null 2>&1; then
        sensible-browser "${URL}" >/dev/null 2>&1 &
    else
        echo "[Aether-Core] Please open your browser to: ${URL}"
    fi
}

case "$1" in
    stop)
        stop_server
        ;;
    status)
        if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
            echo "[Aether-Core] Server is RUNNING (PID: $(cat "$PID_FILE")) at ${URL}"
        else
            echo "[Aether-Core] Server is STOPPED."
        fi
        ;;
    test)
        echo "[Aether-Core] Executing all verification suites..."
        node "$DIR/tests/test_engine.js"
        node "$DIR/tests/test_full_logic.js"
        node "$DIR/tests/test_simulation.js"
        node "$DIR/tests/test_screens.js"
        ;;
    *)
        start_server
        open_browser
        echo "=================================================="
        echo "   ★ AETHER-CORE: THE LIVING WORLD-COIN MATRIX ★  "
        echo "   Game URL: ${URL}                                "
        echo "   To stop server: aether-core stop               "
        echo "=================================================="
        ;;
esac

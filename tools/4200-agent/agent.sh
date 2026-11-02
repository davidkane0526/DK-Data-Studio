#!/system/bin/sh
# DKDS 4200 Agent v0.2: read-only local diagnostics, no remote commands.
set -u
BASE=/data/adb/dkds-agent
LOGDIR="$BASE/logs"
LOG="$LOGDIR/diagnostics.log"
PIDFILE="$BASE/agent.pid"

ensure_dirs() {
  [ "$(id -u)" = "0" ] || { echo "KernelSU/root required" >&2; exit 1; }
  umask 077
  mkdir -p "$LOGDIR" || exit 1
  chmod 700 "$BASE" "$LOGDIR"
}

rotate() {
  [ -f "$LOG" ] || return 0
  bytes=$(wc -c < "$LOG" 2>/dev/null || echo 0)
  [ "$bytes" -le 1048576 ] || mv -f "$LOG" "$LOGDIR/diagnostics.previous.log"
}

snapshot() {
  echo "=== $(date -u '+%Y-%m-%dT%H:%M:%SZ') ==="
  echo "model=$(getprop ro.product.model) android=$(getprop ro.build.version.release)"
  echo "boot=$(getprop sys.boot_completed)"
  echo "[dkds app]"
  dumpsys package com.dk.datastudio 2>/dev/null | grep -m 1 'versionName=' || true
  pidof com.dk.datastudio 2>/dev/null || echo "not-running"
  echo "[interfaces]"
  ip -4 -o addr show dev wlan0 2>&1 || true
  if [ ! -d /sys/class/net/eth0 ]; then
    echo "ETHERNET_WAITING: eth0 absent (USB Ethernet unplugged or not enumerated)."
    echo "No instrument reachability test attempted."
    echo "[route without Ethernet; Wi-Fi fallback is expected]"
    ip -4 route get 169.254.111.118 2>&1 || true
  else
    echo "ETHERNET_PRESENT: eth0 detected"
    cat /sys/class/net/eth0/operstate 2>/dev/null || true
    ip -4 -o addr show dev eth0 2>&1 || true
    echo "[instrument route]"
    route_result=$(ip -4 route get 169.254.111.118 2>&1)
    echo "$route_result"
    case " $route_result " in
      *" dev eth0 "*)
        echo "ROUTE_ETH0: destination route uses USB Ethernet"
        ;;
      *)
        echo "ROUTE_WARNING: eth0 exists but selected route does not use eth0"
        ;;
    esac
    echo "[neighbor cache]"
    ip neigh show dev eth0 2>&1 || true
  fi
  echo
}

is_running() {
  [ -r "$PIDFILE" ] || return 1
  old=$(cat "$PIDFILE" 2>/dev/null)
  case "$old" in *[!0-9]*|"") return 1;; esac
  kill -0 "$old" 2>/dev/null || return 1
  [ -r "/proc/$old/cmdline" ] || return 1
  tr '\000' ' ' < "/proc/$old/cmdline" | grep -F "$BASE/agent.sh loop" >/dev/null 2>&1
}

ensure_dirs
case "${1:-once}" in
  once)
    rotate
    snapshot >> "$LOG" 2>&1
    echo "Saved diagnostic snapshot to $LOG"
    ;;
  crash)
    # AndroidRuntime logs stay on this device; nothing is uploaded.
    rotate
    echo "=== crash log requested $(date -u) ===" >> "$LOG"
    logcat -d -t 150 -s AndroidRuntime:E >> "$LOG" 2>&1
    echo "Saved local crash log to $LOG"
    ;;
  loop)
    if is_running; then
      echo "Already running: $(cat "$PIDFILE")"
      exit 0
    fi
    echo "$$" > "$PIDFILE"
    trap 'rm -f "$PIDFILE"' EXIT
    trap 'exit 0' HUP INT TERM
    while :; do
      rotate
      snapshot >> "$LOG" 2>&1
      sleep 300
    done
    ;;
  start)
    if is_running; then
      echo "Agent already running"
      exit 0
    fi
    (sh "$BASE/agent.sh" loop </dev/null >/dev/null 2>&1) &
    echo "Agent started (background)"
    ;;
  stop)
    if is_running; then
      kill "$(cat "$PIDFILE")" 2>/dev/null || true
      echo "Stop requested"
    else
      echo "Agent not running"
    fi
    ;;
  status)
    if is_running; then echo "running pid=$(cat "$PIDFILE")"
    else echo "stopped"; fi
    ;;
  *)
    echo "Usage: agent.sh {once|crash|start|stop|status}" >&2
    exit 2
    ;;
esac

#!/system/bin/sh
# KernelSU service.d entry. All actual work stays in an independent read-only agent.
AGENT=/data/adb/dkds-agent/agent.sh
[ -f "$AGENT" ] || exit 0
(
  # Start only after Android has completed booting.
  tries=0
  while [ "$(getprop sys.boot_completed)" != "1" ] && [ "$tries" -lt 60 ]; do
    sleep 2
    tries=$((tries + 1))
  done
  /system/bin/sh "$AGENT" start
) </dev/null >/dev/null 2>&1 &
exit 0

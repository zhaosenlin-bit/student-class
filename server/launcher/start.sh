#!/bin/sh
# Starts the course on this machine and opens it in the browser.
cd "$(dirname "$0")" || exit 1

if command -v node >/dev/null 2>&1; then
  exec node ./serve.mjs "$(pwd)" "{{COURSE}}"
fi
if command -v python3 >/dev/null 2>&1; then
  exec python3 ./serve.py "$(pwd)" "{{COURSE}}"
fi
if command -v python >/dev/null 2>&1; then
  exec python ./serve.py "$(pwd)" "{{COURSE}}"
fi
echo "Neither Node.js nor Python was found on this machine."
echo "Opening the file directly; the course may not draw."
open "{{COURSE}}" 2>/dev/null || xdg-open "{{COURSE}}" 2>/dev/null

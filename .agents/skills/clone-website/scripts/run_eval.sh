#!/usr/bin/env bash
# End-to-end clone benchmark: probe original, probe clone, score.
# Usage: bash run_eval.sh <original-url> <clone-url> [out-dir]
# Exit code is the scorer's: 0 pass, 1 fail.
set -euo pipefail

ORIG="${1:?original url required}"
CLONE="${2:?clone url required}"
OUT="${3:-./eval-out}"
SKILL_DIR="$(cd "$(dirname "$0")/.." && pwd)"
mkdir -p "$OUT"
# ego's nodejs process does not inherit this shell's cwd; relative paths ENOENT inside the probe
OUT="$(cd "$OUT" && pwd)"

probe() {
  local side="$1" url="$2"
  ego-browser nodejs <<EOF
const { evalProbe } = await import('$SKILL_DIR/tools/eval-probe.js')
await taskSpaces.useOrCreate('reverse eval')
const summary = await evalProbe({ page, browser }, {
  url: '$url',
  outPath: '$OUT/$side.json',
  screenshotPath: '$OUT/$side-full.png',
})
console.log(JSON.stringify(summary))
EOF
}

probe original "$ORIG"
probe clone "$CLONE"

python3 "$SKILL_DIR/scripts/eval_score.py" \
  "$OUT/original.json" "$OUT/clone.json" \
  --shots "$OUT/original-full.png" "$OUT/clone-full.png" \
  --out "$OUT"

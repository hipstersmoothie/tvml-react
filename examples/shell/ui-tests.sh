#!/bin/sh
# Run the remote-driven UI tests on a tvOS simulator: HelloTests against the
# hello example, KitchenSinkTests against the kitchen-sink example.
#
#   ./ui-tests.sh                       # first available Apple TV simulator
#   SIMULATOR_ID=<udid> ./ui-tests.sh
#   ./ui-tests.sh -only-testing:TVMLExamplesUITests/KitchenSinkTests
#
# Extra arguments go to xcodebuild. Starts each example's dev server (hello on
# 9100, kitchen-sink on 9108) unless one is already running.
set -eu
cd "$(dirname "$0")"

if [ -z "${SIMULATOR_ID:-}" ]; then
  SIMULATOR_ID=$(xcrun simctl list devices available | grep -m1 'Apple TV' | sed -E 's/.*\(([0-9A-F-]{36})\).*/\1/')
fi

started=""
serve() { # example port
  if ! curl -s -o /dev/null "http://localhost:$2/Application.js"; then
    (cd "../$1" && pnpm dev > "/tmp/tvml-react-$1-dev.log" 2>&1) &
    started="$started $!"
    for _ in $(seq 1 30); do
      curl -s -o /dev/null "http://localhost:$2/Application.js" && break
      sleep 1
    done
  fi
}
cleanup() {
  for pid in $started; do
    pkill -P "$pid" 2>/dev/null || true
    kill "$pid" 2>/dev/null || true
  done
}
trap cleanup EXIT INT TERM

serve hello 9100
serve kitchen-sink 9108

xcrun simctl boot "$SIMULATOR_ID" 2>/dev/null || true
xcrun simctl bootstatus "$SIMULATOR_ID" -b > /dev/null

# One simulator, no clones: tests drive the remote and assert on focus.
xcodebuild \
  -project TVMLExamples.xcodeproj \
  -scheme TVMLExamples \
  -destination "platform=tvOS Simulator,id=$SIMULATOR_ID" \
  -parallel-testing-enabled NO \
  "$@" \
  test

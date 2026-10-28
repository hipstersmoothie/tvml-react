#!/bin/sh
# Run the remote-driven UI tests against the hello example on a tvOS simulator.
#
#   ./ui-tests.sh                       # first available Apple TV simulator
#   SIMULATOR_ID=<udid> ./ui-tests.sh
#
# Starts the hello dev server (port 9100) unless one is already running.
set -eu
cd "$(dirname "$0")"

if [ -z "${SIMULATOR_ID:-}" ]; then
  SIMULATOR_ID=$(xcrun simctl list devices available | grep -m1 'Apple TV' | sed -E 's/.*\(([0-9A-F-]{36})\).*/\1/')
fi

started=""
if ! curl -s -o /dev/null http://localhost:9100/Application.js; then
  (cd ../hello && pnpm dev > /tmp/tvml-react-hello-dev.log 2>&1) &
  started=$!
  for _ in $(seq 1 30); do
    curl -s -o /dev/null http://localhost:9100/Application.js && break
    sleep 1
  done
fi
cleanup() {
  if [ -n "$started" ]; then
    pkill -P "$started" 2>/dev/null || true
    kill "$started" 2>/dev/null || true
  fi
}
trap cleanup EXIT

xcrun simctl boot "$SIMULATOR_ID" 2>/dev/null || true
xcrun simctl bootstatus "$SIMULATOR_ID" -b > /dev/null

# One simulator, no clones: tests drive the remote and assert on focus.
xcodebuild test \
  -project TVMLExamples.xcodeproj \
  -scheme TVMLExamples \
  -destination "platform=tvOS Simulator,id=$SIMULATOR_ID" \
  -parallel-testing-enabled NO

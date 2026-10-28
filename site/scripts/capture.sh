#!/bin/sh
# Captures every docs example (site/src/examples) on the tvOS simulator and
# writes them to public/captures as 1280px JPEGs, which <Example> shows
# beside each example's code. Needs Xcode and an Apple TV simulator.
#
#   site/scripts/capture.sh
#   SIMULATOR_ID=<udid> site/scripts/capture.sh
set -eu
cd "$(dirname "$0")/.."
site=$(pwd)
raw=$(mktemp -d)

TEST_RUNNER_SCREENSHOTS="$raw" ../examples/shell/ui-tests.sh \
  -only-testing:TVMLExamplesUITests/DocsGalleryTests

mkdir -p public/captures
for png in "$raw"/*.png; do
  name=$(basename "$png" .png)
  sips -s format jpeg -s formatOptions 75 --resampleWidth 1280 "$png" \
    --out "$site/public/captures/$name.jpg" > /dev/null
  echo "captured $name"
done
rm -rf "$raw"

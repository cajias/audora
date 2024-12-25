#!/usr/bin/env bash
set -e

echo "Building osx-audio..."
deno check packages/osx-audio/mod.ts

echo "Building whisper-integration..."
deno check packages/whisper-integration/mod.ts

echo "Building audio-cli..."
deno check packages/audio-cli/main.ts

echo "Build complete!"


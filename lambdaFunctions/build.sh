#!/usr/bin/env bash
set -e
find * -maxdepth 0 -type d -exec sh -c "cd {} && ./build.sh" \;

#!/usr/bin/env bash
set -e
find * -type d -maxdepth 0 -exec sh -c "cd {} && ./build.sh" \;

#!/usr/bin/env bash
set -e
cp ../../.env .
rm -rf vendor/bundle
bundle install --path vendor/bundle

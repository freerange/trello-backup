#!/usr/bin/env bash
set -e
cp ../../.env .
rm -rf vendor/bundle
bundle config set path 'vendor/bundle'
bundle install

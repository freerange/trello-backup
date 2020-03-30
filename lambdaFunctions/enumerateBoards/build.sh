#!/usr/bin/env bash
set -e
rm -rf vendor/bundle
bundle config set path 'vendor/bundle'
bundle install

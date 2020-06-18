#!/usr/bin/env bash

set -eu

yarn release -- --prerelease pre --no-verify --skip.changelog=true --message "chore(release): %s [skip ci]"

git push --follow-tags origin main

yarn publish --tag pre

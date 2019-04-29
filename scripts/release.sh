#!/usr/bin/env bash

set -eu

npm run release -- --prerelease pre --no-verify --skip.changelog=true --message "chore(release): %s [skip ci]"

git push --follow-tags origin master

npm publish --tag pre

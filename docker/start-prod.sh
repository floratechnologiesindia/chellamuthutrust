#!/bin/sh
set -e
node /app/server/dist/index.js &
nginx -g 'daemon off;'

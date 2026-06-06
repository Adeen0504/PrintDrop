#!/bin/bash
set -e   # stop immediately if any command fails

echo "── Installing server dependencies ──"
cd server && npm install && cd ..

echo "── Installing client dependencies ──"
cd client && npm install

echo "── Building React app ──"
npm run build

echo "── Copying build output to server/public ──"
cp -r dist ../server/public

echo "── Build complete ✓ ──"

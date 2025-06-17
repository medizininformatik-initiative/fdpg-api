#!/bin/bash

set -e

# === Config ===
HOST="datenportal.forschen-fuer-gesundheit.de"
PORT=443
CERT_DIR="./certs"
LEAF_CERT="$CERT_DIR/leaf.pem"
INTERMEDIATE_URL="https://ssl-tools.net/certificates/2fc5de6528cdbe50a14c382fc1de524faabf95fc.pem"
INTERMEDIATE_CERT="$CERT_DIR/d-trust-intermediate.pem"
ROOT_URL="https://ssl-tools.net/certificates/58e8abb0361533fb80f79b1b6d29d3ff8d5f00f0.pem"
ROOT_CERT="$CERT_DIR/d-trust-root.pem"
CHAIN_FILE="$CERT_DIR/ca-chain.pem"

mkdir -p "$CERT_DIR"

echo "Fetching leaf certificate from $HOST..."

# === Step 1: Get leaf certificate from host ===
openssl s_client -showcerts -connect "$HOST:$PORT" -servername "$HOST" </dev/null 2>/dev/null \
  | awk 'BEGIN {found=0} /BEGIN CERTIFICATE/ {found=1} {if (found) print}' \
  | awk '/END CERTIFICATE/ {print; exit} 1' > "$LEAF_CERT"

echo "✅ Leaf certificate saved to $LEAF_CERT"

# === Step 2: Download intermediate certificate ===
echo "Downloading intermediate certificate from D-TRUST..."
curl -s "$INTERMEDIATE_URL" -o "$INTERMEDIATE_CERT"

if [[ ! -s "$INTERMEDIATE_CERT" ]]; then
  echo "Failed to download intermediate cert."
  exit 1
fi

echo "Downloading root certificate from D-TRUST..."
curl -s "$ROOT_URL" -o "$ROOT_CERT"

if [[ ! -s "$ROOT_CERT" ]]; then
  echo "Failed to download root cert."
  exit 1
fi

echo "Root certificate saved to $ROOT_CERT"

# === Step 4: Combine all into full chain ===
cat "$LEAF_CERT" "$INTERMEDIATE_CERT" "$ROOT_CERT" > "$CHAIN_FILE"
echo "Full certificate chain written to $CHAIN_FILE"

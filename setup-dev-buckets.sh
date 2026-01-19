#!/bin/bash

# Setup script for creating and configuring MinIO buckets
# Creates one private bucket and one public-read bucket.

set -e

echo "Setting up MinIO buckets..."

# Load environment variables from .env file
if [ -f .env ]; then
    export $(grep -v '^#' .env | grep -E '^(S3_ENDPOINT|S3_PORT|S3_BUCKET|S3_PUBLIC_BUCKET|S3_ACCESSKEY|S3_SECRETKEY|S3_USE_SSL)=' | xargs)
fi

# Override with .env.local if it exists (for local secrets)
if [ -f .env.local ]; then
    export $(grep -v '^#' .env.local | grep -E '^(S3_ENDPOINT|S3_PORT|S3_BUCKET|S3_PUBLIC_BUCKET|S3_ACCESSKEY|S3_SECRETKEY|S3_USE_SSL)=' | xargs)
fi

# Validate required environment variables
if [ -z "$S3_ENDPOINT" ] || [ -z "$S3_PORT" ] || [ -z "$S3_BUCKET" ] || [ -z "$S3_PUBLIC_BUCKET" ]; then
    echo "ERROR: Missing required environment variables (S3_ENDPOINT, S3_PORT, S3_BUCKET, S3_PUBLIC_BUCKET)"
    echo "Please check your .env and .env.local files"
    exit 1
fi

if [ -z "$S3_ACCESSKEY" ] || [ -z "$S3_SECRETKEY" ]; then
    echo "ERROR: Missing S3 credentials (S3_ACCESSKEY, S3_SECRETKEY)"
    echo "Please add them to .env.local file"
    exit 1
fi

# Determine protocol based on S3_USE_SSL
PROTOCOL="http"
if [ "${S3_USE_SSL}" = "true" ]; then
    PROTOCOL="https"
fi

MINIO_URL="${PROTOCOL}://${S3_ENDPOINT}:${S3_PORT}"

echo "Configuration:"
echo "  MinIO URL:       ${MINIO_URL}"
echo "  Private Bucket:  ${S3_BUCKET}"
echo "  Public Bucket:   ${S3_PUBLIC_BUCKET}"
echo ""

# Download MinIO client if not exists
if ! command -v mc &> /dev/null; then
    echo "Installing MinIO client (mc)..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        brew install minio/stable/mc
    else
        # Linux
        wget https://dl.min.io/client/mc/release/linux-amd64/mc -O /tmp/mc
        chmod +x /tmp/mc
        sudo mv /tmp/mc /usr/local/bin/mc
    fi
    echo "mc installed."
fi

# Wait for MinIO server to be ready
# This is crucial when running after 'docker compose up'
echo "Waiting for MinIO server at ${MINIO_URL}..."
# We use -k to ignore self-signed certs in dev
until $(curl --output /dev/null --silent --head --fail -k "${MINIO_URL}/minio/health/live"); do
    printf '.'
    sleep 2
done
echo ""
echo "MinIO server is up!"

# Configure MinIO alias
echo "Configuring MinIO client alias..."
# Use --api "S3v4" to ensure compatibility
mc alias set minio-setup "${MINIO_URL}" "${S3_ACCESSKEY}" "${S3_SECRETKEY}" --api "S3v4"

# Create private bucket
echo "Creating private bucket: ${S3_BUCKET}..."
mc mb minio-setup/${S3_BUCKET} --ignore-existing

# Create public bucket
echo "Creating public bucket: ${S3_PUBLIC_BUCKET}..."
mc mb minio-setup/${S3_PUBLIC_BUCKET} --ignore-existing

# Set public read policy on the public bucket
# The private bucket remains private by default (no policy)
echo "Setting public read policy for ${S3_PUBLIC_BUCKET}..."
mc anonymous set download minio-setup/${S3_PUBLIC_BUCKET}

# Remove alias after setup
mc alias remove minio-setup

echo ""
echo "MinIO bucket setup complete!"
echo ""
echo "  Private Bucket: ${S3_BUCKET} (private)"
echo "  Public Bucket:  ${S3_PUBLIC_BUCKET} (public-read)"
echo "  Access Public:  ${MINIO_URL}/${S3_PUBLIC_BUCKET}/<filename>"
echo ""
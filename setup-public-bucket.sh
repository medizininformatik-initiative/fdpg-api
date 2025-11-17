#!/bin/bash

# Setup script for creating and configuring public MinIO bucket
# This script creates a public bucket for permanent file storage

set -e

echo "Setting up public MinIO bucket..."

# Load environment variables from .env file
if [ -f .env ]; then
    export $(grep -v '^#' .env | grep -E '^(S3_ENDPOINT|S3_PORT|S3_PUBLIC_BUCKET|S3_ACCESSKEY|S3_SECRETKEY)=' | xargs)
fi

# Override with .env.local if it exists (for local secrets)
if [ -f .env.local ]; then
    export $(grep -v '^#' .env.local | grep -E '^(S3_ENDPOINT|S3_PORT|S3_PUBLIC_BUCKET|S3_ACCESSKEY|S3_SECRETKEY)=' | xargs)
fi

# Validate required environment variables
if [ -z "$S3_ENDPOINT" ] || [ -z "$S3_PORT" ] || [ -z "$S3_PUBLIC_BUCKET" ]; then
    echo "❌ Error: Missing required environment variables (S3_ENDPOINT, S3_PORT, S3_PUBLIC_BUCKET)"
    echo "Please check your .env file"
    exit 1
fi

if [ -z "$S3_ACCESSKEY" ] || [ -z "$S3_SECRETKEY" ]; then
    echo "❌ Error: Missing S3 credentials (S3_ACCESSKEY, S3_SECRETKEY)"
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
echo "  MinIO URL: ${MINIO_URL}"
echo "  Public Bucket: ${S3_PUBLIC_BUCKET}"
echo ""

# Download MinIO client if not exists
if ! command -v mc &> /dev/null; then
    echo "Installing MinIO client..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        brew install minio/stable/mc
    else
        wget https://dl.min.io/client/mc/release/linux-amd64/mc
        chmod +x mc
        sudo mv mc /usr/local/bin/
    fi
fi

# Configure MinIO alias
echo "Configuring MinIO alias..."
mc alias set minio-setup "${MINIO_URL}" "${S3_ACCESSKEY}" "${S3_SECRETKEY}"

# Create public bucket
echo "Creating public bucket: ${S3_PUBLIC_BUCKET}..."
mc mb minio-setup/${S3_PUBLIC_BUCKET} --ignore-existing

# Set public read policy on the bucket
echo "Setting public read policy..."
mc anonymous set download minio-setup/${S3_PUBLIC_BUCKET}

# Remove alias after setup
mc alias remove minio-setup

# Verify setup
echo ""
echo "✅ Public bucket setup complete!"
echo ""
echo "Bucket: ${S3_PUBLIC_BUCKET}"
echo "Access: ${MINIO_URL}/${S3_PUBLIC_BUCKET}/<filename>"
echo ""
echo "You can now use the StorageService.copyToPublicBucket() method to copy files"
echo "from the private bucket to the public bucket for permanent access."

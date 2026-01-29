#!/bin/bash
# Generate self-signed SSL certificates for development/internal use
# For production, use Let's Encrypt or an internal CA

set -e

SSL_DIR="$(dirname "$0")/nginx/ssl"
mkdir -p "$SSL_DIR"

DOMAIN="${1:-proroom.local}"

echo "Generating self-signed SSL certificate for: $DOMAIN"

openssl req -x509 -nodes -days 3650 \
  -newkey rsa:4096 \
  -keyout "$SSL_DIR/privkey.pem" \
  -out "$SSL_DIR/fullchain.pem" \
  -subj "/CN=$DOMAIN" \
  -addext "subjectAltName=DNS:$DOMAIN,DNS:*.$DOMAIN,IP:127.0.0.1"

echo "SSL certificates generated in $SSL_DIR/"
echo "  - fullchain.pem (certificate)"
echo "  - privkey.pem (private key)"

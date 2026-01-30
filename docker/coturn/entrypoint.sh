#!/bin/sh
set -e

CONF="/tmp/turnserver.conf"
TEMPLATE="/etc/coturn/turnserver.conf.template"

# Copy template and replace env vars
cp "$TEMPLATE" "$CONF"

sed -i "s|CHANGE_THIS_TO_YOUR_TURN_SECRET|${TURN_SECRET}|g" "$CONF"

# Inject relay-ip and external-ip if provided
if [ -n "$RELAY_IP" ]; then
  echo "relay-ip=$RELAY_IP" >> "$CONF"
fi

if [ -n "$EXTERNAL_IP" ]; then
  echo "external-ip=$EXTERNAL_IP" >> "$CONF"
fi

exec turnserver -c "$CONF" "$@"

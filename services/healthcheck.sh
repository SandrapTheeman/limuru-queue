#!/bin/sh
# Healthcheck script for nginx - simpler check

# Check if nginx process is running
if ! pgrep nginx > /dev/null; then
    exit 1
fi

# Check if port 80 is listening using netcat or /proc
if ! nc -z localhost 80 2>/dev/null; then
    # Alternative: check using /proc/net/tcp
    if ! grep -q "00000000:0050" /proc/net/tcp 2>/dev/null; then
        exit 1
    fi
fi

exit 0

#!/bin/sh
# Genera config.js con la URL del backend recibida por variable de entorno.
set -e
cat > /usr/share/nginx/html/config.js <<CFG
window.__CONFIG__ = { apiUrl: '${API_URL:-}' };
CFG
echo "Frontend apuntando a: ${API_URL:-(mismo origen)}"
exec nginx -g 'daemon off;'

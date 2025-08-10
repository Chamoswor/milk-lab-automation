#!/bin/sh
set -e

: "${NGINX_SERVER_NAME:?NGINX_SERVER_NAME må være satt}"
: "${NGINX_SERVER_NAME_WWW:?NGINX_SERVER_NAME_WWW må være satt}"
SSL_DIR=/etc/nginx/ssl
CRT="$SSL_DIR/$NGINX_SERVER_NAME.crt"
KEY="$SSL_DIR/$NGINX_SERVER_NAME.key"
DHPARAM="$SSL_DIR/dhparam.pem"

mkdir -p "$SSL_DIR"

if [ ! -f "$CRT" ] || [ ! -f "$KEY" ]; then
  echo "→ Genererer self-signed cert for $NGINX_SERVER_NAME og $NGINX_SERVER_NAME_WWW"
  cat > /tmp/openssl.cnf <<EOF
[req]
default_bits       = 2048
distinguished_name = req_distinguished_name
req_extensions     = v3_req
x509_extensions    = v3_ca
[req_distinguished_name]
countryName                = Country Name (2 letter code)
countryName_default        = ${SSL_COUNTRY_NAME}
stateOrProvinceName        = State or Province Name
stateOrProvinceName_default= ${SSL_STATE_OR_PROVINCE_NAME}
localityName               = Locality Name
localityName_default       = ${SSL_LOCALITY_NAME}
organizationName           = Organization Name
organizationName_default   = ${SSL_ORGANIZATION_NAME}
commonName                 = Common Name
commonName_default         = ${NGINX_SERVER_NAME}
[ v3_req ]
subjectAltName = @alt_names
[ v3_ca ]
subjectAltName = @alt_names
[ alt_names ]
DNS.1   = ${NGINX_SERVER_NAME}
DNS.2   = ${NGINX_SERVER_NAME_WWW}
EOF

  openssl req -x509 -nodes -days 365 \
    -newkey rsa:2048 \
    -keyout "$KEY" \
    -out "$CRT" \
    -config /tmp/openssl.cnf \
    -extensions v3_ca \
    -batch 

  if [ ! -f "$DHPARAM" ]; then
    echo "→ Genererer DH-parametre for forward secrecy…"
    openssl dhparam -out "$DHPARAM" 2048
  fi
else
  echo "→ Fant eksisterende sertifikat og nøkkel - hopper over."
fi

exec "$@"

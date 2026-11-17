#!/bin/sh
# Sobe o nginx e a API no mesmo container (ver dockerfile da raiz).
#
# A API vira o processo principal (exec): se ela cair -- banco fora no boot, panic --
# o container sai e o Railway reinicia ele inteiro, em vez de ficar um nginx de pé
# respondendo 502 pra sempre. O SIGTERM do deploy chega direto nela.
# ponytail: o nginx não é vigiado; se só ele morrer o container segue de pé. É o
# processo que menos cai -- se acontecer, trocar por um supervisor (s6, supervisord).
set -eu

# Só o PORT entra no envsubst: as $variáveis do próprio nginx ($uri, $host...)
# têm que chegar intactas no config.
envsubst '${PORT}' < /etc/nginx/default.conf.template > /etc/nginx/conf.d/default.conf
nginx

# A API escuta só por dentro; quem atende a PORT pública é o nginx.
# TRUSTED_PROXIES fixo: o único proxy que fala com a API é o nginx, que repassa
# só o X-Real-IP do Railway (ver nginx-api.conf).
cd /app
PORT=8081 TRUSTED_PROXIES=127.0.0.1/32 exec ./main

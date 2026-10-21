# Imagem de produção -- multi-stage. Um SPA compila pra arquivo estático,
# não precisa de Node rodando em produção: o builder gera o `dist/` e o
# estágio final só serve com nginx. Dev continua fora daqui, direto no
# docker-compose.yml (image: node:22-alpine + `npm run dev`, sem Dockerfile
# próprio -- o Vite já faz hot-reload nativo, não precisa de nada como o
# CompileDaemon do back-end).
FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# REACT_APP_URL_API/VITE_USE_MOCKS são resolvidas em BUILD TIME, não runtime
# (ver ../sistema-OSm--Back-end/CLAUDE.md, "Domínio e build"): vite.config.ts
# injeta REACT_APP_URL_API no bundle via `define`, e VITE_USE_MOCKS é lido de
# import.meta.env -- os dois travados no momento do `vite build`. Setar como
# variável de runtime do container final não teria efeito nenhum; por isso
# viram ARG aqui, passados com `docker build --build-arg`.
ARG REACT_APP_URL_API
ARG VITE_USE_MOCKS=false
ENV REACT_APP_URL_API=$REACT_APP_URL_API
ENV VITE_USE_MOCKS=$VITE_USE_MOCKS

RUN npm run build

FROM nginx:alpine

# Railway (e a maioria dos PaaS) injeta PORT em runtime e espera o serviço
# escutar nela -- nginx não lê variável de ambiente sozinho, então o config
# vira um .template em /etc/nginx/templates/: a imagem oficial já roda
# envsubst nele sozinha no boot (docker-entrypoint.d, feature nativa da
# imagem, sem script custom) e gera o default.conf de verdade em
# /etc/nginx/conf.d/. O envsubst da imagem só substitui variáveis que
# realmente existem no ambiente -- por isso $uri/$host etc. do nginx (que
# não são env var) sobrevivem intactos, só ${PORT} é trocado.
# O ENV aqui é só o default caso ninguém injete PORT (docker run avulso,
# outro host); Railway sobrescreve com o valor dele.
ENV PORT=8080

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

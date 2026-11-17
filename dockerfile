# Imagem única de produção: site e API no mesmo container.
#
# O nginx escuta na PORT que o Railway injeta, serve o front e repassa /api para
# o binário Go em 127.0.0.1:8081. Front e API na mesma origem: o front é buildado
# com REACT_APP_URL_API=/api, então o cookie de sessão (SameSite=Lax) nunca cruza
# domínio, e cada tenant (<subdominio>.radaptech.com.br) já chega com a API junto.
#
# Os crons usam esta mesma imagem com outro start command no Railway
# (`./main backup-banco`, `./main preventivas-vencidas`): o start command
# substitui o CMD, então só o binário roda, sem nginx.

FROM node:22-alpine AS front
WORKDIR /front
COPY sistema-OSm--Front-end/package.json sistema-OSm--Front-end/package-lock.json ./
RUN npm ci
COPY sistema-OSm--Front-end/ .
# Resolvidas em build time (ver o dockerfile do front): /api é a mesma origem.
ENV REACT_APP_URL_API=/api
ENV VITE_USE_MOCKS=false
RUN npm run build

FROM golang:1.26.5-alpine AS back
WORKDIR /back
COPY sistema-OSm--Back-end/go.mod sistema-OSm--Back-end/go.sum ./
RUN go mod download
COPY sistema-OSm--Back-end/ .
RUN CGO_ENABLED=0 go build -buildvcs=false -o main .

FROM nginx:alpine

# ca-certificates: HTTPS pro R2. postgresql17-client: pg_dump do backup-banco,
# na mesma major do Supabase (ver docs/deploy-e-operacao.md do back).
RUN apk add --no-cache ca-certificates postgresql17-client

WORKDIR /app
COPY --from=back /back/main .
# config/conn.go lê as migrations por caminho relativo ao WORKDIR.
COPY --from=back /back/database/migrate ./database/migrate

COPY --from=front /front/dist /usr/share/nginx/html
COPY sistema-OSm--Front-end/nginx.conf.template /etc/nginx/default.conf.template
COPY nginx-api.conf /etc/nginx/extras/api.conf
COPY iniciar.sh /iniciar.sh

# Default de quem roda fora do Railway; lá a PORT é injetada.
ENV PORT=8080

# O ENTRYPOINT do nginx:alpine só executa o CMD quando ele não é "nginx",
# então o iniciar.sh roda direto e cuida dos dois processos.
CMD ["/iniciar.sh"]

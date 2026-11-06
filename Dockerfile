FROM node:22.22.0-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install --global npm@11
RUN npm ci --ignore-scripts

COPY . .

# Variables Vite : figées dans le bundle au moment du build
ARG VITE_APP_ENV=production
ARG VITE_DORIFY_DEPLOYMENT_MODE=intra
ARG VITE_PUBLIC_TRACKING_URL=
ARG VITE_API_BASE_URL="http://localhost:3000"
ARG VITE_KIOSK_IDLE_MS="30000"
ARG VITE_SESSION_IDLE_MINUTES="30"
ARG VITE_LEGAL_ENTITY_NAME="Dorify - demonstration"
ARG VITE_LEGAL_ADDRESS="Adresse du responsable Dorify a renseigner"
ARG VITE_LEGAL_EMAIL="legal@dorify.fr"
ARG VITE_LEGAL_REGISTRATION="Immatriculation a renseigner"
ENV VITE_APP_ENV=$VITE_APP_ENV
ENV VITE_DORIFY_DEPLOYMENT_MODE=$VITE_DORIFY_DEPLOYMENT_MODE
ENV VITE_PUBLIC_TRACKING_URL=$VITE_PUBLIC_TRACKING_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_KIOSK_IDLE_MS=$VITE_KIOSK_IDLE_MS
ENV VITE_SESSION_IDLE_MINUTES=$VITE_SESSION_IDLE_MINUTES
ENV VITE_LEGAL_ENTITY_NAME=$VITE_LEGAL_ENTITY_NAME
ENV VITE_LEGAL_ADDRESS=$VITE_LEGAL_ADDRESS
ENV VITE_LEGAL_EMAIL=$VITE_LEGAL_EMAIL
ENV VITE_LEGAL_REGISTRATION=$VITE_LEGAL_REGISTRATION

RUN npm run build

FROM nginxinc/nginx-unprivileged:1.27-alpine AS runtime

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 8080

HEALTHCHECK --interval=10s --timeout=5s --start-period=10s --retries=5 \
  CMD wget --quiet --tries=1 --spider http://127.0.0.1:8080/healthz || exit 1

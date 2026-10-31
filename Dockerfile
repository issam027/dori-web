FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install --global npm@11
RUN npm ci --ignore-scripts

COPY . .

# Variables Vite : figées dans le bundle au moment du build
ARG VITE_APP_ENV=production
ARG VITE_DORIFY_DEPLOYMENT_MODE=intra
ARG VITE_PUBLIC_TRACKING_URL=
ENV VITE_APP_ENV=$VITE_APP_ENV
ENV VITE_DORIFY_DEPLOYMENT_MODE=$VITE_DORIFY_DEPLOYMENT_MODE
ENV VITE_PUBLIC_TRACKING_URL=$VITE_PUBLIC_TRACKING_URL

RUN npm run build

FROM nginxinc/nginx-unprivileged:1.27-alpine AS runtime

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 8080

HEALTHCHECK --interval=10s --timeout=5s --start-period=10s --retries=5 \
  CMD wget --quiet --tries=1 --spider http://127.0.0.1:8080/healthz || exit 1

FROM node:lts-alpine AS base

FROM base AS build-env

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

RUN npm run build

COPY . .

RUN npm ci --only=production && \
  chown -R node .

FROM base AS deploy

HEALTHCHECK  --timeout=3s \
  CMD curl --fail http://localhost:8080/healthcheck || exit 1

EXPOSE 8080

WORKDIR /usr/src/app

RUN apk add --no-cache curl

COPY --from=build-env /usr/src/app /usr/src/app

USER node

CMD [ "node", "distribution/index.js"]

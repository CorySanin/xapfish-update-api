FROM node:lts-alpine as base

FROM base as build-env

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm ci --only=production && \
  chown -R node .

FROM base

HEALTHCHECK  --timeout=3s \
  CMD curl --fail http://localhost:8080/healthcheck || exit 1

EXPOSE 8080

WORKDIR /usr/src/app

RUN apk add --no-cache curl

COPY --from=build-env /usr/src/app /usr/src/app

USER node

CMD [ "node", "index.js"]

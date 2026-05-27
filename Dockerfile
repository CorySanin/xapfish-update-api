FROM node:lts-alpine AS base

FROM base AS build-env

WORKDIR /usr/src/app

RUN apk add --no-cache pnpm

RUN --mount=target=/usr/src/app/package.json,source=package.json \
    --mount=target=/usr/src/app/pnpm-lock.yaml,source=pnpm-lock.yaml \
  pnpm install

COPY --link . .

RUN pnpm run build

RUN pnpm install --prod

FROM base AS deploy

HEALTHCHECK  --timeout=3s \
  CMD curl --fail http://localhost:8080/healthcheck || exit 1

EXPOSE 8080

WORKDIR /usr/src/app

RUN apk add --no-cache curl

COPY --from=build-env --chown=node:node /usr/src/app /usr/src/app

USER node

CMD [ "node", "distribution/index.js"]

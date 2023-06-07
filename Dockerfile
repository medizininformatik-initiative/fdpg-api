FROM node:18 AS build
WORKDIR /usr/src/app
COPY package*.json ./
COPY yarn.lock ./
RUN yarn install
COPY . .
RUN yarn build

FROM node:18-alpine as productionModules
WORKDIR /usr/src/app
COPY package*.json ./
COPY yarn.lock ./
RUN yarn install --production=true

FROM node:18-alpine as release
ARG NODE_ENV=production
ENV NODE_ENV=$NODE_ENV
ARG SOFTWARE_VERSION=FILLED_BY_PIPELINE
LABEL SOFTWARE_VERSION=$SOFTWARE_VERSION
ARG BUILD_DATE=FILLED_BY_PIPELINE
LABEL BUILD_DATE=$BUILD_DATE
ARG BUILD_TIME=FILLED_BY_PIPELINE
LABEL BUILD_TIME=$BUILD_TIME
ARG BUILD_NO_OF_DATE=FILLED_BY_PIPELINE
LABEL BUILD_NO_OF_DATE=$BUILD_NO_OF_DATE
ARG SOURCE_BRANCH=FILLED_BY_PIPELINE
LABEL SOURCE_BRANCH=$SOURCE_BRANCH

WORKDIR /usr/src/app
EXPOSE 3000

COPY static-content ./static-content
COPY --from=build /usr/src/app/dist ./dist
COPY --from=productionModules /usr/src/app/node_modules ./node_modules

CMD ["node", "dist/main"]

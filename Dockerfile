FROM node:22 AS build
WORKDIR /usr/src/app
COPY package*.json ./
COPY yarn.lock ./
RUN yarn install
COPY . .
RUN yarn build

FROM node:22-alpine as productionModules
WORKDIR /usr/src/app
COPY package*.json ./
COPY yarn.lock ./
RUN yarn install --production=true

FROM node:22-alpine as release
ARG NODE_ENV=production
ENV NODE_ENV=$NODE_ENV
ARG SOFTWARE_VERSION=FILLED_BY_PIPELINE
ENV SOFTWARE_VERSION=$SOFTWARE_VERSION

WORKDIR /usr/src/app
EXPOSE 3000

COPY static-content ./static-content
COPY --from=build /usr/src/app/dist ./dist
COPY --from=productionModules /usr/src/app/node_modules ./node_modules

CMD ["node", "dist/main"]

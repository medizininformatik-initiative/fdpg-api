FROM node:14.17.6-alpine3.11 AS development
WORKDIR /usr/src/app
COPY package*.json ./
RUN yarn install --production=false
COPY . .
RUN yarn run build

FROM node:14.17.6-alpine3.11 as production
ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}
WORKDIR /usr/src/app
EXPOSE 3000
COPY package*.json ./
RUN yarn install --production=true
COPY . .
COPY --from=development /usr/src/app/dist ./dist
CMD ["node", "dist/main"]
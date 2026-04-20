FROM node:22.15.0
WORKDIR /usr/app

RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY package.json yarn.lock tsconfig.json ./
RUN yarn install --frozen-lockfile

COPY ./src ./src

RUN yarn dist

EXPOSE 3000

ENV NODE_ENV production

CMD ["node", "./dist/src/index.js"]

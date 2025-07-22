FROM node:22.15.0
WORKDIR /usr/app

# Install system dependencies including cron
RUN apt-get update && apt-get install -y \
    curl \
    cron \
    && rm -rf /var/lib/apt/lists/*

COPY package.json yarn.lock tsconfig.json ./
RUN yarn install --frozen-lockfile

COPY ./src ./src
COPY cron.txt /etc/cron.d/notifire-cron
COPY .env ./

RUN yarn dist

# Set up cron job from file
RUN chmod 0644 /etc/cron.d/notifire-cron
RUN crontab /etc/cron.d/notifire-cron

# Create log directory for cron
RUN mkdir -p /var/log && touch /var/log/cron.log

EXPOSE 3000

# Start cron service and the main application
CMD ["sh", "-c", "cron && node ./dist/src/index.js"]
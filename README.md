# Mida-Sync (Meteo Info Daily Alert Sync)

Mida-Sync is a backend service designed to monitor, aggregate, and notify meteorological alerts and reports. The system analyzes alerts issued by the Emilia-Romagna Region, integrating them with convective forecasts at national and European levels, to send timely and detailed notifications via Telegram.

## Implemented Products and Services

The system interfaces with various official and unofficial sources to provide a complete meteorological overview:

1. **[Allerta Meteo Regione Emilia-Romagna](https://allertameteo.regione.emilia-romagna.it/)**
   - **Feature:** Daily monitoring of the meteorological alert status.
   - **Details:** Extracts data via the open APIs of the civil protection, focusing particularly on the "D1" alert zone. It detects critical alerts (yellow, orange, red) for hydraulic risk, hydrogeological risk, thunderstorms, wind, extreme temperatures, and snow/ice.
   - **Notification:** Sends a Telegram message formatted with the alert colors and a direct link to the official PDF bulletin.

2. **[Estofex (European Storm Forecast Experiment)](https://www.estofex.org/)**
   - **Feature:** Integration of European severe storm bulletins.
   - **Details:** Analyzes the Estofex XML feed to check for level 1, 2, or 3 forecasts for the following day.
   - **Notification:** In case of critical alerts in the local territory, it sends the European convective forecast map to the Telegram channel.

3. **[Pretemp (Previsione Temporali)](https://pretemp.altervista.org/)**
   - **Feature:** Integration of Italian thunderstorm forecast bulletins.
   - **Details:** Dynamically retrieves forecast maps for the following day via the Pretemp archive.
   - **Notification:** If conditions require it (presence of ongoing alerts), it sends the thunderstorm forecast image to the Telegram channel.

## Scheduled Tasks (Crons)

The application relies on scheduled tasks (crons) to automate the weather monitoring flow:

- **Meteo Alerts Check**
  - Periodically checks the status of the Emilia-Romagna weather alerts for the following day. If it detects a critical alert that has not been notified yet, it sends it on Telegram and saves it in the database.
- **Pretemp Report Check**
  - Verifies and sends the Pretemp map for the following day, provided there is an ongoing alert and the map hasn't been sent yet.
- **Estofex Report Check**
  - Verifies and sends the Estofex map for the following day, following the same conditional logic based on ongoing alerts.

## Configuration and Installation

### Prerequisites

- Node.js (v22+)
- PostgreSQL
- Docker (optional, for deployment)
- A valid Telegram Bot token and a destination Chat ID.

### Environment Variables (`.env`)

The project uses a `.env` file for configuration. Copy `.env.example` to `.env` and fill in the values:

```bash
cp .env.example .env
```

Required keys include:

- PostgreSQL Database credentials (Host, User, Password, DB Name)
- `TELEGRAM_TOKEN`: Telegram Bot token.
- `CHAT_ID`: ID of the Telegram chat or channel where alerts will be sent.
- `ALERT_ZONE`: alert zone code to monitor (default `D1`).

The `.env` file is git-ignored and is injected into the container at runtime via `docker-compose.yml` (`env_file`). It is **not** baked into the Docker image. If credentials leak, rotate the Telegram bot token via [@BotFather](https://t.me/BotFather) and reset the PostgreSQL password.

### Development Setup

```bash
# Install dependencies
npm install

# Start development server (on port 3000)
npm run start
```

### Build and Deployment

```bash
# TypeScript compilation
npm run dist

# Start via Docker Compose
npm run deploy
```

## Testing

The project uses `mocha` and `chai` for testing. Tests can be run with:

```bash
npm run test
```

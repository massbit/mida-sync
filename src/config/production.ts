import { Config } from './config'

export const productionConfig: Config = {
    database: {
        user: 'postgres',
        host: 'localhost',
        database: 'mida',
        password: 'gAJqPYHM8p7WRLrWZFCj',
        port: 5432,
    },
    telegram_token: process.env.TELEGRAM_TOKEN as string,
    google_maps_api_key: process.env.GOOGLE_MAPS_API_KEY as string,
}

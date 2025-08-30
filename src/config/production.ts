import { Config } from './config'

export const productionConfig: Config = {
    database: {
        user: process.env.DATABASE_USERNAME as string,
        host: process.env.DATABASE_PROD_HOST as string,
        database: process.env.DATABASE_NAME as string,
        password: process.env.DATABASE_PASSWORD as string,
        port: Number(process.env.DATABASE_PORT as string),
    },
    telegram_token: process.env.TELEGRAM_TOKEN as string,
    chat_id: process.env.CHANNEL_ID as string,
}

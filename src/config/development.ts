import { Config } from './config'
import dotenv from 'dotenv'

dotenv.config()

export const developmentConfig: Config = {
    database: {
        user: process.env.DATABASE_USERNAME as string,
        host: process.env.DATABASE_HOST as string,
        database: process.env.DATABASE_NAME as string,
        password: process.env.DATABASE_PASSWORD as string,
        port: Number(process.env.DATABASE_PORT as string),
    },
    telegram_token: process.env.TELEGRAM_2_TOKEN as string,
    chat_id: process.env.CHAT_ID as string,
}

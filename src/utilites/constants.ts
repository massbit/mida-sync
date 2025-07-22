import dotenv from 'dotenv'

dotenv.config()

export const MolinellaCoordinates = {
    latitude: 44.606251,
    longitude: 11.656904,
}

export const MilanCoordinates = {
    latitude: 45.46362,
    longitude: 9.18812,
}

export const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN as string
export const TELEGRAM_2_TOKEN = process.env.TELEGRAM_2_TOKEN as string

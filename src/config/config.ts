import { developmentConfig } from './development'
import { productionConfig } from './production'
import { DatabaseConfig } from '../services/postgresql'

export enum NodeEnv {
    DEVELOPMENT = 'development',
    PRODUCTION = 'production',
}

export interface Config {
    database: DatabaseConfig
    telegram_token: string
    chat_id: string
}

export const getNodeEnv = (): NodeEnv => process.env.NODE_ENV as NodeEnv

const getConfig = (): Config => {
    switch (getNodeEnv()) {
        case NodeEnv.DEVELOPMENT:
            return developmentConfig
        case NodeEnv.PRODUCTION:
            return productionConfig
        default:
            return developmentConfig
    }
}

export const config = getConfig()

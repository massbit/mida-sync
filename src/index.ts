import { config } from './config/config'
import { startServer } from './server'
import PostgreSQL from './services/postgresql'
import logger from './logger'

export let database: PostgreSQL

const app = async () => {
    try {
        await startServer()
        database = new PostgreSQL(config.database)
        await database.start()
    } catch (error) {
        logger.error({ err: error }, 'Application bootstrap failed')
        process.exitCode = 1
    }
}

app()

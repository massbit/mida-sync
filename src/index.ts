import { FastifyInstance } from 'fastify'
import { config } from './config/config'
import { startServer } from './server'
import PostgreSQL from './services/postgresql'
import { startScheduler, stopScheduler } from './scheduler'
import logger from './logger'

export let database: PostgreSQL

let fastifyApp: FastifyInstance | undefined

const SHUTDOWN_TIMEOUT_MS = 10_000

const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Shutdown signal received')

    const forceExit = setTimeout(() => {
        logger.error({ signal }, 'Graceful shutdown timed out, forcing exit')
        process.exit(1)
    }, SHUTDOWN_TIMEOUT_MS)
    forceExit.unref()

    try {
        stopScheduler()
        if (fastifyApp) {
            await fastifyApp.close()
        }
        if (database) {
            await database.stop()
        }
        logger.info('Shutdown complete')
        process.exit(0)
    } catch (err) {
        logger.error({ err }, 'Error during shutdown')
        process.exit(1)
    }
}

const app = async () => {
    try {
        fastifyApp = await startServer()
        database = new PostgreSQL(config.database)
        await database.start()
        startScheduler()
        // Surface the effective notification config at boot (no secrets) so a missing chat id or
        // token is obvious in the logs instead of failing silently.
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
        logger.info(
            { hasChatId: !!config.chat_id, hasToken: !!config.telegram_token, alertZone: config.alert_zone, timezone },
            'Configuration loaded'
        )

        // Every date this service reasons about is a Rome calendar day (ARPAE bulletins, the Pretemp
        // archive, croner's schedules), and moment formats in the process zone. Running in UTC filed
        // Rome day D under D-1 between midnight and the UTC rollover, re-sending the alert and both
        // maps every night. TZ is set in docker-compose.yml; a missing tzdata would silently undo it.
        if (timezone !== 'Europe/Rome') {
            logger.warn({ timezone }, 'Process timezone is not Europe/Rome: daily rollovers will be wrong')
        }
    } catch (error) {
        logger.error({ err: error }, 'Application bootstrap failed')
        process.exitCode = 1
    }
}

process.on('SIGTERM', () => void shutdown('SIGTERM'))
process.on('SIGINT', () => void shutdown('SIGINT'))

app()

import Fastify, { FastifyInstance } from 'fastify'
import { registerMeteoAlertsRoutes } from './routes/meteo-alerts'
import i18next from 'i18next'
import italian from './resources/locales/it.json'
import { registerTestMessageRoutes } from './routes/test-message'
import { registerForecastReportsRoutes } from './routes/forecast-reports'
import { registerRiversRoutes } from './routes/rivers'
import logger from './logger'

const translations = {
    it: {
        translation: italian,
    },
}

export const startServer = async (): Promise<FastifyInstance> => {
    const fastify = Fastify({
        loggerInstance: logger,
        disableRequestLogging: true,
        bodyLimit: 1024,
        requestTimeout: 15000,
    })

    fastify.setErrorHandler((err, request, reply) => {
        request.log.error({ err }, 'Unhandled error in route handler')
        if (err.validation) {
            reply.status(400).send({ error: 'Bad Request' })
            return
        }
        reply.status(err.statusCode || 500).send({ error: 'Internal Server Error' })
    })

    void i18next.init({
        resources: translations,
        fallbackLng: 'it',
        interpolation: {
            escapeValue: false,
        },
    })

    fastify.get('/health', async () => {
        return { status: 'ok' }
    })

    const app = fastify as unknown as FastifyInstance
    registerTestMessageRoutes(app)
    registerMeteoAlertsRoutes(app)
    registerForecastReportsRoutes(app)
    registerRiversRoutes(app)

    await fastify.listen({
        host: '127.0.0.1',
        port: 3000,
    })

    logger.info('HTTP server started on port 3000')

    return app
}

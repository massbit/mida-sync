import Fastify from 'fastify'
import { registerNotifireRoutes } from './routes/notifire'
import { registerMeteoAlertsRoutes } from './routes/meteo-alerts'

export const startServer = async () => {
    const fastify = Fastify({
        logger: true,
        disableRequestLogging: true,
    })

    fastify.get('/health', async () => {
        return { status: 'ok' }
    })

    registerNotifireRoutes(fastify)
    registerMeteoAlertsRoutes(fastify)

    await fastify.listen({
        port: 3000,
    })
}

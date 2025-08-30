import Fastify from 'fastify'
import { registerMeteoAlertsRoutes } from './routes/meteo-alerts'
import i18next from 'i18next'
import italian from './resources/locales/it.json'
import { registerTestMessageRoutes } from './routes/test-message'

const translations = {
    it: {
        translation: italian,
    },
}

export const startServer = async () => {
    const fastify = Fastify({
        logger: true,
        disableRequestLogging: true,
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

    registerTestMessageRoutes(fastify)
    registerMeteoAlertsRoutes(fastify)

    await fastify.listen({
        port: 3000,
    })
}

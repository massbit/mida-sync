import Fastify from 'fastify'
import { registerNotifireRoutes } from './routes/notifire'

export const startServer = async () => {
    const fastify = Fastify({
        logger: true,
    })

    fastify.get('/health', async () => {
        return { status: 'ok' }
    })

    registerNotifireRoutes(fastify)

    await fastify.listen({
        port: 3000,
    })
}

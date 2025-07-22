import Fastify from 'fastify'
import { registerNotifireRoutes } from './routes/notifire'

export const startServer = async () => {
    const fastify = Fastify({
        logger: true,
    })

    registerNotifireRoutes(fastify)

    await fastify.listen({
        port: 3000,
    })
}

import { syncNotifireData } from "../sync/notifire"

export const registerNotifireRoutes = (fastify) => {
    fastify.route({
        method: 'POST',
        url: '/notifire',
        handler: async (_, reply) => {
            await syncNotifireData()

            reply.status(204).send()
        },
    })
}

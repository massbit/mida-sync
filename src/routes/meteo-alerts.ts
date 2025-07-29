export const registerMeteoAlertsRoutes = (fastify) => {
    fastify.route({
        method: 'POST',
        url: '/meteo-alerts',
        handler: async (_, reply) => {
            reply.status(204).send(undefined)
        },
    })
}

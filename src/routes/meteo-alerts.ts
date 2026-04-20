import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { runMeteoAlertCheck } from '../tasks/meteo-alerts'

export const registerMeteoAlertsRoutes = (fastify: FastifyInstance) => {
    fastify.route({
        method: 'POST',
        url: '/meteo-alerts',
        schema: {
            body: { type: 'object', additionalProperties: false, maxProperties: 0 },
        },
        handler: async (_request: FastifyRequest, reply: FastifyReply) => {
            const parsedAlert = await runMeteoAlertCheck()

            if (!parsedAlert) {
                return reply.status(204).send(undefined)
            }

            reply.status(200).send(parsedAlert)
        },
    })
}

import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { runPretempCheck } from '../tasks/pretemp'
import { runEstofexCheck } from '../tasks/estofex'

export const registerForecastReportsRoutes = (fastify: FastifyInstance) => {
    fastify.route({
        method: 'POST',
        url: '/check-pretemp-report',
        schema: {
            body: { type: 'object', additionalProperties: false, maxProperties: 0 },
        },
        handler: async (_request: FastifyRequest, reply: FastifyReply) => {
            const result = await runPretempCheck()

            if (result === 'telegram-failed') {
                return reply.status(502).send({ error: 'Telegram send failed' })
            }

            reply.status(204).send(undefined)
        },
    })
    fastify.route({
        method: 'POST',
        url: '/check-estofex-report',
        schema: {
            body: { type: 'object', additionalProperties: false, maxProperties: 0 },
        },
        handler: async (_request: FastifyRequest, reply: FastifyReply) => {
            const result = await runEstofexCheck()

            if (result === 'telegram-failed') {
                return reply.status(502).send({ error: 'Telegram send failed' })
            }

            reply.status(204).send(undefined)
        },
    })
}

import { config } from '../config/config'
import { getEstofexReport } from '../services/estofex'
import { getTomorrowPretempReport } from '../services/pretemp'
import { sendPhotoMessage } from '../services/telegram'

export const registerForecastReportsRoutes = (fastify) => {
    fastify.route({
        method: 'POST',
        url: '/check-pretemp-report',
        handler: async (_, reply) => {
            const tomorrowReport = await getTomorrowPretempReport()

            if (!tomorrowReport) {
                return reply.status(204).send(undefined)
            }

            await sendPhotoMessage(config.chat_id, tomorrowReport, 'Nuovo report Pretemp disponibile')

            reply.status(200).send(tomorrowReport)
        },
    })
    fastify.route({
        method: 'POST',
        url: '/check-estofex-report',
        handler: async (_, reply) => {
            const tomorrowReport = await getEstofexReport()

            if (!tomorrowReport) {
                return reply.status(204).send(undefined)
            }

            reply.status(200).send(tomorrowReport)
        },
    })
}

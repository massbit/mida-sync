import { config } from '../config/config'
import { checkEstofexReport } from '../controllers/estofex'
import { getEstofexImage, getEstofexReport } from '../services/estofex'
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

            reply.status(204).send(undefined)
        },
    })
    fastify.route({
        method: 'POST',
        url: '/check-estofex-report',
        handler: async (_, reply) => {
            const tomorrowReport = await getEstofexReport()

            const isReportValid = checkEstofexReport(tomorrowReport)

            if (!isReportValid) {
                return reply.status(204).send(undefined)
            }

            const estofexImage = await getEstofexImage()

            await sendPhotoMessage(config.chat_id, estofexImage, 'Nuovo report Estofex disponibile')

            reply.status(204).send(undefined)
        },
    })
}

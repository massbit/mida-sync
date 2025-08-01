import { sendNewTomorrowAlertMessage } from '../controllers/telegram'
import { getLastAlertReport, updateLastAlertReport } from '../models/last-alert-report'
import { getMeteoAlert } from '../services/meteo-alerts'
import { parseMeteoAlert } from '../utilites/meteo-alerts'

export const registerMeteoAlertsRoutes = (fastify) => {
    fastify.route({
        method: 'POST',
        url: '/meteo-alerts',
        handler: async (_, reply) => {
            const tomorrowAlert = await getMeteoAlert('2025-07-28 13:00')

            if (!tomorrowAlert) {
                return reply.status(204).send(undefined)
            }

            const parsedAlert = parseMeteoAlert(tomorrowAlert, 'D1')

            const lastAlertReport = await getLastAlertReport()

            if (lastAlertReport.report_id !== parsedAlert.id) {
                if (parsedAlert.isCritic) {
                    sendNewTomorrowAlertMessage(parsedAlert)
                }

                await updateLastAlertReport(parsedAlert.id)
            }

            reply.status(200).send(parsedAlert)
        },
    })
}

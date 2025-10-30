import { sendNewTomorrowAlertMessage } from '../utilites/telegram'
import { getLastAlertReport, updateLastAlertReport } from '../models/last-alert-report'
import { getTomorrowMeteoAlert } from '../services/meteo-alerts'
import { parseMeteoAlert } from '../utilites/meteo-alerts'

export const registerMeteoAlertsRoutes = (fastify) => {
    fastify.route({
        method: 'POST',
        url: '/meteo-alerts',
        handler: async (_, reply) => {
            const tomorrowAlert = await getTomorrowMeteoAlert()

            if (!tomorrowAlert) {
                return reply.status(204).send(undefined)
            }

            const parsedAlert = parseMeteoAlert(tomorrowAlert, 'D1')

            const lastAlertReport = await getLastAlertReport()

            if (lastAlertReport.report_id !== parsedAlert.id) {
                if (parsedAlert.isCritic) {
                    sendNewTomorrowAlertMessage(parsedAlert)
                }

                await updateLastAlertReport({
                    report_id: parsedAlert.id,
                    is_critic: parsedAlert.isCritic,
                })
            }

            reply.status(200).send(parsedAlert)
        },
    })
}

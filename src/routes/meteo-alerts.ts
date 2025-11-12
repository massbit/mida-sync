import { sendNewTomorrowAlertMessage } from '../utilites/telegram'
import { createAlertReport, getLastAlertReport } from '../models/alert-report'
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

            if (lastAlertReport.report_number !== parsedAlert.id) {
                if (parsedAlert.isCritic) {
                    sendNewTomorrowAlertMessage(parsedAlert)
                }

                await createAlertReport({
                    report_number: parsedAlert.id,
                    is_critic: parsedAlert.isCritic,
                    estofex_sent: false,
                    pretemp_sent: false,
                    created_on: new Date().toISOString(),
                    starts_on: parsedAlert.dataInizio,
                    ends_on: parsedAlert.dataFine,
                    emitted_on: parsedAlert.dataEmissione,
                })
            }

            reply.status(200).send(parsedAlert)
        },
    })
}

import { sendNewTomorrowAlertMessage } from '../controllers/telegram'
import { getMeteoAlert } from '../services/meteo-alerts'
import { parseMeteoAlert } from '../utilites/meteo-alerts'

export const registerMeteoAlertsRoutes = (fastify) => {
    fastify.route({
        method: 'POST',
        url: '/meteo-alerts',
        handler: async (_, reply) => {
            const tomorrowAlert = await getMeteoAlert('2025-07-07 13:00')

            if (!tomorrowAlert) {
                return reply.status(204).send(undefined)
            }

            const parsedAlert = parseMeteoAlert(tomorrowAlert, 'D1')

            if(parsedAlert.isCritic){
                sendNewTomorrowAlertMessage(parsedAlert)
            }

            reply.status(200).send(parsedAlert)
        },
    })
}

import { checkIfInterventionIsOfCompetence, syncNotifireData } from '../controllers/intervention'
import { sendInterventionMessage } from '../controllers/telegram'

export const registerNotifireRoutes = (fastify) => {
    fastify.route({
        method: 'POST',
        url: '/notifire',
        handler: async (_, reply) => {
            const interventions = await syncNotifireData()

            // Filter interventions to include only those relevant to Molinella and within a 16 km radius
            const filteredInterventions = interventions.filter((item) => {
                if (checkIfInterventionIsOfCompetence(item)) {
                    return true
                }

                return item.distance <= 16 // 16 km radius
            })

            for (let i = 0; i < filteredInterventions.length; i++) {
                const intervention = filteredInterventions[i]

                await sendInterventionMessage(intervention)
            }

            reply.status(200).send(filteredInterventions)
        },
    })
}

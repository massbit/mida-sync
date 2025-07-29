import { checkIfInterventionIsOfCompetence, syncNotifireData } from '../controllers/intervention'
import { sendInterventionMessage } from '../controllers/telegram'
import { createIntervention, getInterventionByUuid } from '../models/intervention'

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

                return item.distance <= 16.5
            })

            for (let i = 0; i < filteredInterventions.length; i++) {
                const intervention = filteredInterventions[i]

                const foundIntervention = await getInterventionByUuid(intervention.intervention.id)

                if (foundIntervention) {
                    continue
                }

                await sendInterventionMessage(intervention)

                await createIntervention({
                    uuid: intervention.intervention.id,
                    title: intervention.intervention.title,
                    position: {
                        type: 'Point',
                        coordinates: [intervention.intervention.longitude, intervention.intervention.latitude],
                    },
                    sender: intervention.intervention.sender,
                    start_time: intervention.intervention.startTime,
                    type: intervention.intervention.type,
                    active: true,
                })
            }

            reply.status(204).send(undefined)
        },
    })
}

import * as Telegram from 'telegraf'
import { checkIfInterventionIsOfCompetence } from '../controllers/intervention'
import { syncNotifireData } from '../sync/notifire'
import { TELEGRAM_2_TOKEN } from '../utilites/constants'

const separator = '--------------------------------'
const bot = new Telegram.Telegraf(TELEGRAM_2_TOKEN)

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

                // return item.distance <= 16 // 16 km radius
                return true
            })

            for (let i = 0; i < filteredInterventions.length; i++) {
                const intervention = filteredInterventions[i]

                let title = 'NUOVO INTERVENTO IN ZONA!'

                if (!checkIfInterventionIsOfCompetence(intervention)) {
                    title = 'INTERVENTO FUORI COMPETENZA!'
                }

                const mapsUrl = `https://www.google.it/maps/place/${intervention.intervention.latitude},${intervention.intervention.longitude}`
                const appleMapsUrl = `https://maps.apple.com/?ll=${intervention.intervention.latitude},${intervention.intervention.longitude}`
                const wazeUrl = `https://waze.com/ul?ll=${intervention.intervention.latitude},${intervention.intervention.longitude}&navigate=yes`

                // Prepare the competence message with MOLINELLA in bold
                const competencesMessage = Object.values(intervention.territory)
                    .map((value, index) => {
                        // Make MOLINELLA bold using HTML formatting
                        const formattedValue =
                            value && value.includes('MOLINELLA')
                                ? value.replace('MOLINELLA', '<b>MOLINELLA</b>')
                                : value || 'N/A'
                        return `${index + 1}. ${formattedValue}`
                    })
                    .join('\n')

                // Do not change the indentation, it is important for the Telegram message formatting
                const textMessage = `
🚒 ${title} 🚧
📟 ${intervention.intervention.title} 
📏 ${Math.round(intervention.distance * 100) / 100} km 
${separator}
🗺️ Competenze:
${competencesMessage}
${separator}
📢 ${intervention.intervention.sender}
`

                await bot.telegram.sendMessage('516662533', textMessage, {
                    parse_mode: 'HTML',
                    reply_markup: {
                        inline_keyboard: [
                            [
                                { text: '📍 Google Maps', url: mapsUrl },
                                { text: '🍏 Apple Maps', url: appleMapsUrl },
                                { text: '🗺️ Waze', url: wazeUrl },
                            ],
                        ],
                    },
                })
            }

            reply.status(200).send(filteredInterventions)
        },
    })
}

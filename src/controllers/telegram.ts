import { sendTelegramMessage } from '../services/telegram'
import { ElaboratedIntervention, checkIfInterventionIsOfCompetence } from './intervention'

const separator = '--------------------------------'

export const sendInterventionMessage = async (intervention: ElaboratedIntervention) => {
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
                value && value.includes('MOLINELLA') ? value.replace('MOLINELLA', '<b>MOLINELLA</b>') : value || 'N/A'
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

    await sendTelegramMessage('516662533', textMessage, {
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

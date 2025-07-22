import { sendTelegramMessage } from '../services/telegram'
import { ElaboratedIntervention, checkIfInterventionIsOfCompetence } from './intervention'
import * as locations from '../data/locations.json'
import { getGoogleMapsRoute } from '../services/google-maps'

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
    const competencesMessage = await generateCompetenceMessage(intervention)

    // Do not change the indentation, it is important for the Telegram message formatting
    const textMessage = `
🚒 ${title}
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

export const generateCompetenceMessage = async (intervention: ElaboratedIntervention): Promise<string> => {
    const competences = Object.values(intervention.territory) as string[]
    const computedCompetences: string[] = []

    for (let i = 0; i < competences.length; i++) {
        const competence = competences[i]

        const foundLocation = locations.locations.find(
            (location) => location.name.toUpperCase() === competence.toUpperCase()
        )

        if (foundLocation !== undefined) {
            const routeInformations = await getGoogleMapsRoute(
                {
                    latitude: foundLocation.latitude,
                    longitude: foundLocation.longitude,
                },
                {
                    latitude: intervention.intervention.latitude,
                    longitude: intervention.intervention.longitude,
                }
            )

            if (!routeInformations) {
                computedCompetences.push(`${i + 1}. ${foundLocation.name} (N/A)`)
                continue
            }

            computedCompetences.push(
                `${i + 1}. ${foundLocation.name} (${routeInformations.distance} km, ${routeInformations.duration} min)`
            )
        } else {
            computedCompetences.push(`${i + 1}. ${competence} (N/A)`)
        }
    }

    return computedCompetences.join('\n')
}

import { sendTelegramMessage } from '../services/telegram'
import { ElaboratedIntervention, checkIfInterventionIsOfCompetence } from './intervention'
import * as locations from '../data/locations.json'
import { getAddressFromCoordinates, getGoogleMapsRoute } from '../services/google-maps'
import { getTelegramUsers } from '../models/telegram-user'
import { MolinellaCoordinates } from '../utilites/constants'
import { InlineKeyboardButton } from 'telegraf/typings/core/types/typegram'
import { getActualWorkShift } from '../utilites/common'

const molinellaWord = 'MOLINELLA'

const separator = '--------------------------------'

export const sendInterventionMessage = async (intervention: ElaboratedIntervention) => {
    let title = 'NUOVO INTERVENTO IN ZONA!'

    if (!checkIfInterventionIsOfCompetence(intervention)) {
        title = 'INTERVENTO FUORI COMPETENZA!'
    }

    const mapsUrl = `https://www.google.it/maps/place/${intervention.intervention.latitude},${intervention.intervention.longitude}`
    const appleMapsUrl = `https://maps.apple.com/?ll=${intervention.intervention.latitude},${intervention.intervention.longitude}`
    const wazeUrl = `https://waze.com/ul?ll=${intervention.intervention.latitude},${intervention.intervention.longitude}`

    const placeAddress = await getAddressFromCoordinates({
        latitude: intervention.intervention.latitude,
        longitude: intervention.intervention.longitude,
    })

    // Prepare the competence message with MOLINELLA in bold
    const competencesMessage = await generateCompetenceMessage(intervention)

    const permanentCurrentShift = getActualWorkShift(false)
    const volunteerCurrentShift = getActualWorkShift(true)

    // Do not change the indentation, it is important for the Telegram message formatting
    const textMessage = `
🚒 ${title}
📟 ${intervention.intervention.title}
📍 ${placeAddress || 'Indirizzo non disponibile'}
📢 ${intervention.intervention.sender}
${separator}
🗺️ Competenze:
${competencesMessage}
${separator}
🗒️ Turno: ${permanentCurrentShift.shift} ${permanentCurrentShift.night ? 'Notturno' : 'Diurno'}
🗓️ Turno volontario: ${volunteerCurrentShift.shift} ${volunteerCurrentShift.night ? 'Notturno' : 'Diurno'}
`

    const buttons: InlineKeyboardButton[][] = [
        [
            { text: '📍 Google Maps', url: mapsUrl },
            { text: '🍏 Apple Maps', url: appleMapsUrl },
            { text: '🗺️ Waze', url: wazeUrl },
        ],
        [
            {
                text: 'Asset Bologna',
                url: 'https://vvfsctas.maps.arcgis.com/apps/webappviewer/index.html?id=4fdccb08973d4ba5ab41e021a16e3241',
            },
        ],
    ]

    const telegramUsers = await getTelegramUsers()

    for (let i = 0; i < telegramUsers.length; i++) {
        const user = telegramUsers[i]

        try {
            await sendTelegramMessage(user.chat_id, textMessage, {
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: buttons,
                },
            })
        } catch (error) {
            console.error(`Failed to send message to user ${user.chat_id}:`, error)
        }
    }
}

export const generateCompetenceMessage = async (intervention: ElaboratedIntervention): Promise<string> => {
    const computedCompetences: string[] = []

    if (intervention.territory) {
        const competences = Object.values(intervention.territory) as string[]

        for (let i = 0; i < competences.length; i++) {
            const competence = competences[i]

            const foundLocation = locations.locations.find((location) =>
                competence.toUpperCase().includes(location.name.toUpperCase())
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
    }

    if (computedCompetences.length === 0) {
        computedCompetences.push('Non è stata trovata nessuna competenza per questo intervento.')
    }

    const hasMolinella = computedCompetences.some((c) => c.toUpperCase().includes(molinellaWord))

    if (!hasMolinella) {
        const routeInformations = await getGoogleMapsRoute(
            {
                latitude: MolinellaCoordinates.latitude,
                longitude: MolinellaCoordinates.longitude,
            },
            {
                latitude: intervention.intervention.latitude,
                longitude: intervention.intervention.longitude,
            }
        )

        let distances = '(N/A)'

        if (routeInformations) {
            distances = `(${routeInformations.distance} km, ${routeInformations.duration} min)`
        }

        computedCompetences.push(`\n*. ${molinellaWord} ${distances}`)
    }

    // Join and put molinella in bold
    return computedCompetences.join('\n').replace(molinellaWord, `<b>${molinellaWord}</b>`)
}

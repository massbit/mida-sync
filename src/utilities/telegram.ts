import { sendTelegramMessage } from '../services/telegram'
import { InlineKeyboardButton } from 'telegraf/typings/core/types/typegram'
import { translateKey } from './common'
import { ParsedMeteoAlert } from './meteo-alerts'
import { MeteoAlertType } from '../services/meteo-alerts'
import { ThresholdCrossing } from './river-sensors'
import { River } from '../models/river'
import { config } from '../config/config'

const separator = '--------------------------------'

// River/flood alerting is still being tuned, so its messages are flagged as test output. Remove
// this prefix (and its uses below) once the models are trusted.
const testPrefix = '🧪 TEST — '

const thresholdLabel: Record<ThresholdCrossing['threshold']['key'], string> = {
    soglia1: 'soglia 1',
    soglia2: 'soglia 2',
    soglia3: 'soglia 3',
}

export type AlertDay = 'today' | 'tomorrow'

const colorEmoji: Record<string, string> = {
    green: '🟢',
    yellow: '🟡',
    orange: '🟠',
    red: '🔴',
}

const colorLabel = (color: string) => `${colorEmoji[color.toLowerCase()] || ''} ${translateKey(`alert.colors.${color}`, 'it')}`

// Previous per-phenomenon colours, keyed like criticZoneData (e.g. { temporali: 'yellow' }). Empty
// for a first alert on a date; then the plain colour is printed instead of a transition.
export type PreviousAlertColors = Record<string, string>

export const sendMeteoAlertMessage = async (
    alert: ParsedMeteoAlert,
    day: AlertDay = 'tomorrow',
    previousColors: PreviousAlertColors = {}
) => {
    // Phenomena that dropped back to green leave criticZoneData entirely; without them an alert that
    // only de-escalated would render exactly like the previous one, so keep their line and show the
    // move to green.
    const phenomena = [...new Set([...Object.keys(alert.criticZoneData), ...Object.keys(previousColors)])]

    const criticDataMessage = phenomena
        .map((key) => {
            const color = alert.criticZoneData[key as keyof typeof alert.criticZoneData] ?? MeteoAlertType.green
            const previousColor = previousColors[key]

            // Only render a transition when the colour actually moved, so a re-issue that merely adds
            // a phenomenon keeps the plain line for the ones that did not change.
            return previousColor && previousColor !== color
                ? `${key.toUpperCase()}: ${colorLabel(previousColor)} → ${colorLabel(color)}`
                : `${key.toUpperCase()}: ${colorLabel(color)}`
        })
        .join('\n')

    const heading =
        day === 'today' ? '⚠️ Aggiornamento allerta meteo di oggi!' : '⚠️ Nuova allerta meteo per domani!'

    const textMessage = `${heading}
📅 Data inizio: ${alert.dataInizio}
📅 Data fine: ${alert.dataFine}
${separator}
Zona ${config.alert_zone}:
${criticDataMessage}
${separator}
📜 Descrizione: ${alert.descrizionemeteo}
`

    const buttons: InlineKeyboardButton[][] = [[{ text: 'Documento pdf', url: alert.link }]]

    await sendTelegramMessage(config.chat_id, textMessage, {
        parse_mode: 'HTML',
        reply_markup: {
            inline_keyboard: buttons,
        },
    })
}

export const sendMeteoAllClearMessage = async (alert: ParsedMeteoAlert, day: AlertDay = 'tomorrow') => {
    const heading =
        day === 'today' ? '🟢 Allerta meteo di oggi rientrata' : '🟢 Allerta meteo per domani rientrata'

    const textMessage = `${heading}
📅 Data inizio: ${alert.dataInizio}
📅 Data fine: ${alert.dataFine}
${separator}
Zona ${config.alert_zone}: nessuna criticità
${separator}
📜 Descrizione: ${alert.descrizionemeteo}
`

    const buttons: InlineKeyboardButton[][] = [[{ text: 'Documento pdf', url: alert.link }]]

    await sendTelegramMessage(config.chat_id, textMessage, {
        parse_mode: 'HTML',
        reply_markup: {
            inline_keyboard: buttons,
        },
    })
}

export const sendRiverLevelCrossingMessage = async (
    river: River,
    crossing: ThresholdCrossing,
    currentValue: number
) => {
    const label = thresholdLabel[crossing.threshold.key]
    const directionLine =
        crossing.direction === 'above' ? `⬆️ Superata ${label}` : `⬇️ Rientrata sotto ${label}`

    const textMessage = `${testPrefix}🌊 Livello del ${river.river_name} — ${river.station_name}
${directionLine}
Livello attuale: ${currentValue} m
Soglia: ${crossing.threshold.value} m`

    // No parse_mode: the body has no markup and river/station names are operator-supplied, so HTML
    // parsing would only risk breaking on characters like & or <.
    await sendTelegramMessage(config.chat_id, textMessage)
}

export interface FloodPredictionPayload {
    upstreamValue: number
    leadTimeMinutes: number
    predictedExceedanceAt: number
    targetThreshold: number
}

export const formatLeadTime = (minutes: number): string => {
    const total = Math.max(0, Math.round(minutes))
    const hours = Math.floor(total / 60)
    const mins = total % 60

    if (hours === 0) {
        return `${mins} min`
    }

    return mins === 0 ? `${hours}h` : `${hours}h ${mins}min`
}

export const sendFloodPredictionMessage = async (
    downstream: River,
    upstream: River,
    payload: FloodPredictionPayload
) => {
    const eta = new Date(payload.predictedExceedanceAt).toLocaleString('it-IT', {
        timeZone: 'Europe/Rome',
        weekday: 'short',
        hour: '2-digit',
        minute: '2-digit',
    })

    const textMessage = `${testPrefix}🌊⚠️ Possibile piena in arrivo
Monte: ${upstream.river_name} — ${upstream.station_name}: ${payload.upstreamValue} m
Storicamente questo livello a monte ha preceduto il superamento della soglia ${payload.targetThreshold} a ${downstream.river_name} — ${downstream.station_name}.
Arrivo stimato: tra ~${formatLeadTime(payload.leadTimeMinutes)} (≈ ${eta})
ℹ️ Stima statistica, non una previsione ufficiale: verificare sempre le fonti ufficiali (allertameteo.regione.emilia-romagna.it, Protezione Civile).`

    await sendTelegramMessage(config.chat_id, textMessage)
}

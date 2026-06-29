import { sendTelegramMessage } from '../services/telegram'
import { InlineKeyboardButton } from 'telegraf/typings/core/types/typegram'
import { translateKey } from './common'
import { ParsedMeteoAlert } from './meteo-alerts'
import { ThresholdCrossing } from './river-sensors'
import { River } from '../models/river'
import { config } from '../config/config'

const separator = '--------------------------------'

const thresholdLabel: Record<ThresholdCrossing['threshold']['key'], string> = {
    soglia1: 'soglia 1',
    soglia2: 'soglia 2',
    soglia3: 'soglia 3',
}

export const sendNewTomorrowAlertMessage = async (alert: ParsedMeteoAlert) => {
    const criticDataMessage = Object.keys(alert.criticZoneData)
        .map((key) => {
            const color = alert.criticZoneData[key]
            const colorHtml =
                {
                    green: '🟢',
                    yellow: '🟡',
                    orange: '🟠',
                    red: '🔴',
                }[color.toLowerCase()] || ''

            return `${key.toUpperCase()}: ${colorHtml} ${translateKey(`alert.colors.${color}`, 'it')}`
        })
        .join('\n')

    const textMessage = `⚠️ Nuova allerta meteo per domani!
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

export const sendRiverLevelCrossingMessage = async (
    river: River,
    crossing: ThresholdCrossing,
    currentValue: number
) => {
    const label = thresholdLabel[crossing.threshold.key]
    const directionLine =
        crossing.direction === 'above' ? `⬆️ Superata ${label}` : `⬇️ Rientrata sotto ${label}`

    const textMessage = `🌊 Livello del ${river.river_name} — ${river.station_name}
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

    const textMessage = `🌊⚠️ Possibile piena in arrivo
Monte: ${upstream.river_name} — ${upstream.station_name}: ${payload.upstreamValue} m
Storicamente questo livello a monte ha preceduto il superamento della soglia ${payload.targetThreshold} a ${downstream.river_name} — ${downstream.station_name}.
Arrivo stimato: tra ~${formatLeadTime(payload.leadTimeMinutes)} (≈ ${eta})
ℹ️ Stima statistica, non una previsione ufficiale: verificare sempre le fonti ufficiali (allertameteo.regione.emilia-romagna.it, Protezione Civile).`

    await sendTelegramMessage(config.chat_id, textMessage)
}

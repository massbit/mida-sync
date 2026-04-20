import { sendTelegramMessage } from '../services/telegram'
import { InlineKeyboardButton } from 'telegraf/typings/core/types/typegram'
import { translateKey } from './common'
import { ParsedMeteoAlert } from './meteo-alerts'
import { config } from '../config/config'

const separator = '--------------------------------'

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

import { config } from '../config/config'
import { getTomorrowPretempReport } from '../services/pretemp'
import { sendPhotoMessage } from '../services/telegram'
import { getLastAlertReport, updateLastAlertReport } from '../models/alert-report'
import logger from '../logger'

const log = logger.child({ task: 'pretemp' })

export const runPretempCheck = async (): Promise<'sent' | 'skipped' | 'telegram-failed'> => {
    const lastAlertReport = await getLastAlertReport()

    if (!lastAlertReport.is_critic || lastAlertReport.pretemp_sent) {
        return 'skipped'
    }

    const tomorrowReport = await getTomorrowPretempReport()

    if (!tomorrowReport) {
        return 'skipped'
    }

    try {
        await sendPhotoMessage(config.chat_id, tomorrowReport, 'Nuovo report Pretemp disponibile')
    } catch (err) {
        log.error({ err }, 'Failed to send Pretemp photo to Telegram')
        return 'telegram-failed'
    }

    await updateLastAlertReport({ pretemp_sent: true }, lastAlertReport.id)

    return 'sent'
}

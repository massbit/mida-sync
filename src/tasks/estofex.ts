import { config } from '../config/config'
import { checkEstofexReport } from '../utilities/estofex'
import { getEstofexImage, getEstofexReport } from '../services/estofex'
import { sendPhotoMessage } from '../services/telegram'
import { getLastAlertReport, updateLastAlertReport } from '../models/alert-report'
import logger from '../logger'

const log = logger.child({ task: 'estofex' })

export const runEstofexCheck = async (): Promise<'sent' | 'skipped' | 'telegram-failed'> => {
    const lastAlertReport = await getLastAlertReport()

    if (!lastAlertReport.is_critic || lastAlertReport.estofex_sent) {
        return 'skipped'
    }

    const tomorrowReport = await getEstofexReport()

    if (!checkEstofexReport(tomorrowReport)) {
        return 'skipped'
    }

    const estofexImage = await getEstofexImage()

    try {
        await sendPhotoMessage(config.chat_id, estofexImage, 'Nuovo report Estofex disponibile')
    } catch (err) {
        log.error({ err }, 'Failed to send Estofex photo to Telegram')
        return 'telegram-failed'
    }

    await updateLastAlertReport({ estofex_sent: true }, lastAlertReport.id)

    return 'sent'
}

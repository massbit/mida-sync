import { sendNewTomorrowAlertMessage } from '../utilities/telegram'
import { createAlertReportIfNew } from '../models/alert-report'
import { getTomorrowMeteoAlert } from '../services/meteo-alerts'
import { parseMeteoAlert, ParsedMeteoAlert } from '../utilities/meteo-alerts'
import { config } from '../config/config'
import logger from '../logger'

const log = logger.child({ task: 'meteo-alerts' })

export const runMeteoAlertCheck = async (): Promise<ParsedMeteoAlert | undefined> => {
    const tomorrowAlert = await getTomorrowMeteoAlert()

    if (!tomorrowAlert) {
        return undefined
    }

    const parsedAlert = parseMeteoAlert(tomorrowAlert, config.alert_zone)

    const insertedReport = await createAlertReportIfNew({
        report_number: parsedAlert.id,
        is_critic: parsedAlert.isCritic,
        estofex_sent: false,
        pretemp_sent: false,
        created_on: new Date().toISOString(),
        starts_on: parsedAlert.dataInizio,
        ends_on: parsedAlert.dataFine,
        emitted_on: parsedAlert.dataEmissione,
    })

    if (insertedReport && parsedAlert.isCritic) {
        try {
            await sendNewTomorrowAlertMessage(parsedAlert)
        } catch (err) {
            log.error({ err, alertId: parsedAlert.id }, 'Failed to send Telegram alert')
        }
    }

    return parsedAlert
}

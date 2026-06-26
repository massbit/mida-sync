import { sendNewTomorrowAlertMessage } from '../utilities/telegram'
import { createAlertReport, getAlertReportByNumber } from '../models/alert-report'
import { getTomorrowMeteoAlert } from '../services/meteo-alerts'
import { parseMeteoAlert, ParsedMeteoAlert } from '../utilities/meteo-alerts'
import { config } from '../config/config'
import logger from '../logger'

const log = logger.child({ task: 'meteo-alerts' })

export const runMeteoAlertCheck = async (): Promise<ParsedMeteoAlert | undefined> => {
    const tomorrowAlert = await getTomorrowMeteoAlert()

    if (!tomorrowAlert) {
        log.info({ event: 'no-tomorrow-alert' }, 'No alert published for tomorrow')
        return undefined
    }

    const parsedAlert = parseMeteoAlert(tomorrowAlert, config.alert_zone)

    // We already handled this bulletin: its report row exists. The existence check (instead of an
    // INSERT ... ON CONFLICT) makes the de-dup independent of any unique constraint on the table.
    const existing = await getAlertReportByNumber(parsedAlert.id)

    if (existing) {
        log.info(
            { event: 'already-handled', reportNumber: parsedAlert.id, critic: parsedAlert.isCritic },
            'Bulletin already handled'
        )
        return parsedAlert
    }

    const report = {
        report_number: parsedAlert.id,
        is_critic: parsedAlert.isCritic,
        estofex_sent: false,
        pretemp_sent: false,
        created_on: new Date().toISOString(),
        starts_on: parsedAlert.dataInizio,
        ends_on: parsedAlert.dataFine,
        emitted_on: parsedAlert.dataEmissione,
    }

    // Non-critical bulletin: just record it (so pretemp/estofex see the latest report); no message.
    if (!parsedAlert.isCritic) {
        await createAlertReport(report)
        log.info({ event: 'recorded-non-critical', reportNumber: parsedAlert.id }, 'Recorded non-critical bulletin')
        return parsedAlert
    }

    // Critical bulletin: send the message FIRST and record it only once the send succeeds. This way
    // a failed send is logged AND retried on the next tick, instead of being silently de-duplicated
    // forever (the report row would otherwise mark the bulletin as "seen" even though nothing was
    // delivered).
    try {
        await sendNewTomorrowAlertMessage(parsedAlert)
        await createAlertReport(report)
        log.info({ event: 'sent', reportNumber: parsedAlert.id }, 'Meteo alert sent')
    } catch (err) {
        log.error({ err, alertId: parsedAlert.id }, 'Failed to send meteo alert; will retry next tick')
    }

    return parsedAlert
}

import { AlertDay, sendMeteoAlertMessage } from '../utilities/telegram'
import { createAlertReport, getAlertReportByNumber } from '../models/alert-report'
import { getTodayMeteoAlert, getTomorrowMeteoAlert, MeteoAlert } from '../services/meteo-alerts'
import { parseMeteoAlert, ParsedMeteoAlert } from '../utilities/meteo-alerts'
import customMoment from '../custom-components/custom-moment'
import { config } from '../config/config'
import logger from '../logger'

const log = logger.child({ task: 'meteo-alerts' })

// A bulletin covers a multi-day window and carries a FIXED criticality per day, so the same
// document (e.g. allerta075/2026) is green tomorrow yet orange today. De-dup therefore has to key
// on (bulletin, referenced date), not the bulletin number alone. An escalation arrives as a NEW
// bulletin number for the same date, so it re-sends; re-observing the same bulletin does not.
const reportKey = (id: string, date: string): string => `${id}@${date}`

const handleDayAlert = async (raw: MeteoAlert, day: AlertDay, date: string): Promise<ParsedMeteoAlert> => {
    const parsedAlert = parseMeteoAlert(raw, config.alert_zone)
    const key = reportKey(parsedAlert.id, date)

    const existing = await getAlertReportByNumber(key)

    if (existing) {
        log.info({ event: 'already-handled', reportNumber: key, critic: parsedAlert.isCritic }, 'Bulletin already handled')
        return parsedAlert
    }

    const report = {
        report_number: key,
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
        log.info({ event: 'recorded-non-critical', reportNumber: key }, 'Recorded non-critical bulletin')
        return parsedAlert
    }

    // Critical bulletin: send FIRST and record only once the send succeeds, so a failed send is
    // retried on the next tick instead of being silently de-duplicated forever.
    try {
        await sendMeteoAlertMessage(parsedAlert, day)
        await createAlertReport(report)
        log.info({ event: 'sent', reportNumber: key, day }, 'Meteo alert sent')
    } catch (err) {
        log.error({ err, alertId: key }, 'Failed to send meteo alert; will retry next tick')
    }

    return parsedAlert
}

export const runMeteoAlertCheck = async (): Promise<ParsedMeteoAlert | undefined> => {
    const todayDate = customMoment().format('YYYY-MM-DD')
    const tomorrowDate = customMoment().add(1, 'day').format('YYYY-MM-DD')

    // Process today first so the tomorrow row is the most recent alert_reports row: pretemp/estofex
    // key off getLastAlertReport and are inherently next-day outlooks.
    const todayRaw = await getTodayMeteoAlert()
    const todayAlert = todayRaw ? await handleDayAlert(todayRaw, 'today', todayDate) : undefined
    if (!todayRaw) {
        log.info({ event: 'no-today-alert' }, 'No alert published for today')
    }

    const tomorrowRaw = await getTomorrowMeteoAlert()
    const tomorrowAlert = tomorrowRaw ? await handleDayAlert(tomorrowRaw, 'tomorrow', tomorrowDate) : undefined
    if (!tomorrowRaw) {
        log.info({ event: 'no-tomorrow-alert' }, 'No alert published for tomorrow')
    }

    return tomorrowAlert ?? todayAlert
}

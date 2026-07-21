import { AlertDay, sendMeteoAlertMessage, sendMeteoAllClearMessage } from '../utilities/telegram'
import { createAlertReport, getLatestAlertReportForDate } from '../models/alert-report'
import { getTodayMeteoAlert, getTomorrowMeteoAlert, MeteoAlert } from '../services/meteo-alerts'
import { parseMeteoAlert, ParsedMeteoAlert } from '../utilities/meteo-alerts'
import customMoment from '../custom-components/custom-moment'
import { config } from '../config/config'
import logger from '../logger'

const log = logger.child({ task: 'meteo-alerts' })

// What we must notify on is a CHANGE in the target zone's criticality for a referenced date, NOT a
// new document. ARPAE re-issues the bulletin through the day (new number, same colors) and rolls
// yesterday's "domani" bulletin into today's "oggi" one — both look like fresh documents. Keying on
// the bulletin number therefore re-sent identical alerts (and, via a new report row with
// pretemp/estofex flags reset, re-sent those reports too). So the key is (date, criticality
// signature): same colors for the same date => already handled, no re-send; an escalation changes
// the colors => new key => re-sends.
const criticalitySignature = (alert: ParsedMeteoAlert): string =>
    Object.keys(alert.criticZoneData)
        .sort()
        .map((k) => `${k}=${alert.criticZoneData[k as keyof typeof alert.criticZoneData]}`)
        .join(',')

export const alertReportKey = (alert: ParsedMeteoAlert, date: string): string =>
    `${date}|${criticalitySignature(alert)}`

const handleDayAlert = async (raw: MeteoAlert, day: AlertDay, date: string): Promise<ParsedMeteoAlert> => {
    const parsedAlert = parseMeteoAlert(raw, config.alert_zone)
    const key = alertReportKey(parsedAlert, date)

    // Compare against the LAST criticality state recorded for this date, not against any historical
    // exact-key row. Same signature as last time => genuine no-op re-issue, stay quiet. A different
    // signature is a change we must act on — including a change back to a state seen earlier that
    // day (orange -> green -> orange), which an exact-key lookup would wrongly treat as handled.
    const latest = await getLatestAlertReportForDate(date)

    if (latest && latest.report_number === key) {
        log.info({ event: 'already-handled', reportNumber: key, critic: parsedAlert.isCritic }, 'Criticality unchanged for date')
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

    // Send FIRST and record only once the send succeeds, so a failed send is retried on the next
    // tick instead of being silently de-duplicated forever.
    try {
        if (parsedAlert.isCritic) {
            await sendMeteoAlertMessage(parsedAlert, day)
            await createAlertReport(report)
            log.info({ event: 'sent', reportNumber: key, day }, 'Meteo alert sent')
        } else if (latest?.is_critic) {
            // Downgrade from a critical state we already announced => tell subscribers it is over.
            await sendMeteoAllClearMessage(parsedAlert, day)
            await createAlertReport(report)
            log.info({ event: 'all-clear-sent', reportNumber: key, day }, 'Meteo all-clear sent')
        } else {
            // Non-critical with nothing critical outstanding for this date: record the latest state
            // (so pretemp/estofex and re-escalation detection see it); no message.
            await createAlertReport(report)
            log.info({ event: 'recorded-non-critical', reportNumber: key }, 'Recorded non-critical bulletin')
        }
    } catch (err) {
        log.error({ err, alertId: key }, 'Failed to handle meteo alert; will retry next tick')
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

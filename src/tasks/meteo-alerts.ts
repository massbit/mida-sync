import { AlertDay, PreviousAlertColors, sendMeteoAlertMessage, sendMeteoAllClearMessage } from '../utilities/telegram'
import { AlertReport, createAlertReport, getLatestAlertReportForDate } from '../models/alert-report'
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

// Inverse of criticalitySignature: the tail of report_number already stores the criticality we last
// announced for the date, so the transition can be rendered without another query or column.
export const previousColorsFrom = (report?: AlertReport): PreviousAlertColors =>
    Object.fromEntries(
        (report?.report_number.split('|')[1] || '')
            .split(',')
            .filter(Boolean)
            .map((pair) => pair.split('=') as [string, string])
    )

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
        // ARPAE sometimes serves a bulletin without dataEmissione. Passing it straight through sends
        // an explicit NULL, which defeats the column's DEFAULT now() and trips its NOT NULL check —
        // and because the Telegram send happens before the insert, every retry re-sent the alert.
        emitted_on: parsedAlert.dataEmissione ?? new Date().toISOString(),
    }

    // Send FIRST and record only once the send succeeds, so a failed send is retried on the next
    // tick instead of being silently de-duplicated forever.
    try {
        if (parsedAlert.isCritic) {
            await sendMeteoAlertMessage(parsedAlert, day, previousColorsFrom(latest))
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
    // These labels MUST be Rome calendar dates: the bulletin they file is fetched with a Rome wall
    // clock (romeTimestamp in services/meteo-alerts.ts). moment formats in the process zone, so the
    // container pins TZ=Europe/Rome — see the boot warning in index.ts.
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

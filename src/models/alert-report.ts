import { database } from '..'

const tableName = 'alert_reports'

export interface AlertReport {
    id: number
    report_number: string
    created_on: string
    starts_on: string
    ends_on: string
    emitted_on: string
    estofex_sent: boolean
    pretemp_sent: boolean
    is_critic: boolean
}

type EditableAlertReport = Omit<AlertReport, 'id'>

export const getLastAlertReport = async (): Promise<AlertReport> => {
    const query = `SELECT * FROM ${tableName} ORDER BY id DESC LIMIT 1`

    const reports = await database.query<AlertReport>(query)

    if (reports.length === 0) {
        throw new Error('No last alert report found')
    }

    return reports[0]
}

// The report_number is `${date}|${criticalitySignature}`, so the most recent row whose number
// starts with `${date}|` is the last criticality state we recorded for that referenced date. That
// is what a re-issue must be compared against — NOT "does an exact-key row exist anywhere in
// history", which silently drops a re-escalation back to a previously-seen state. `date` is
// YYYY-MM-DD (no LIKE metacharacters) so the prefix match is exact.
export const getLatestAlertReportForDate = async (date: string): Promise<AlertReport | undefined> => {
    const query = `SELECT * FROM ${tableName} WHERE report_number LIKE $1 ORDER BY id DESC LIMIT 1`

    const rows = await database.query<AlertReport>(query, [`${date}|%`])

    return rows[0]
}

export const createAlertReport = async (report: EditableAlertReport): Promise<AlertReport> => {
    return database.create<AlertReport>(tableName, report)
}

export const createAlertReportIfNew = async (report: EditableAlertReport): Promise<AlertReport | undefined> => {
    return database.createOrIgnore<AlertReport>(tableName, report, 'report_number')
}

export const updateLastAlertReport = async (report: Partial<EditableAlertReport>, id: number): Promise<AlertReport> => {
    return database.edit<AlertReport>(tableName, report, id)
}

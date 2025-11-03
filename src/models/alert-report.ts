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

export const createAlertReport = async (report: EditableAlertReport): Promise<AlertReport> => {
    return database.create<AlertReport>(tableName, report)
}

export const updateLastAlertReport = async (report: Partial<EditableAlertReport>, id: number): Promise<AlertReport> => {
    return database.edit<AlertReport>(tableName, report, id)
}

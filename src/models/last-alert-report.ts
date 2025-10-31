import { database } from '..'

const tableName = 'django_models_latestreport'

export interface LastAlertReport {
    id: number
    report_id: string
    is_critic: boolean
    estofex_sent: boolean
    pretemp_sent: boolean
}

type EditableLastAlertReport = Omit<LastAlertReport, 'id'>

export const getLastAlertReport = async (): Promise<LastAlertReport> => {
    const query = `SELECT * FROM ${tableName} `

    const reports = await database.query<LastAlertReport>(query)

    if (reports.length === 0) {
        throw new Error('No last alert report found')
    }

    return reports[0]
}

export const updateLastAlertReport = async (report: Partial<EditableLastAlertReport>): Promise<void> => {
    await database.edit<LastAlertReport>(tableName, report, 1)
}

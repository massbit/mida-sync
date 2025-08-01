import { database } from '..'

const tableName = 'django_models_latestreport'

export interface LastAlertReport {
    id: number
    report_id: string
}

export const getLastAlertReport = async (): Promise<LastAlertReport> => {
    const query = `SELECT * FROM ${tableName} `

    const reports = await database.query<LastAlertReport>(query)

    if (reports.length === 0) {
        throw new Error('No last alert report found')
    }

    return reports[0]
}

export const updateLastAlertReport = async (reportId: string): Promise<void> => {
    const query = `UPDATE ${tableName} SET report_id = $1 WHERE id = 1`

    await database.query(query, [reportId])
}

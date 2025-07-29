import { database } from '..'
import { getNodeEnv } from '../config/config'

const tableName = 'django_models_telegramuser'

export interface TelegramUser {
    id: number
    chat_id: string
    test: boolean
    accept_intervention_notifiers: boolean
    note: string | null
}

export const getTelegramUsers = async (allowTest: boolean = true): Promise<TelegramUser[]> => {
    const filterStatements: string[] = []

    filterStatements.push('accept_intervention_notifiers = true')

    if (allowTest && getNodeEnv() === 'development') {
        filterStatements.push('test = true')
    }

    const query = `SELECT * FROM ${tableName} ${filterStatements.length > 0 ? 'WHERE ' + filterStatements.join(' AND ') : ''}`

    const result = await database.query<TelegramUser>(query)

    return result
}

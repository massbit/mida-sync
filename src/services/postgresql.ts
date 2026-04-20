import { Pool } from 'pg'
import { database } from '..'
import logger from '../logger'

export interface DatabaseConfig {
    user: string
    host: string
    database: string
    password: string
    port: number
    customIdentifierKey?: string
}

export type QueryValue = string | number | boolean | Date | Buffer | undefined | null | { toSqlString: () => string }

export interface OperationOptions {
    showQuery?: boolean
}

export default class PostgreSQL {
    protected pool: Pool
    protected config: DatabaseConfig

    constructor(config: DatabaseConfig) {
        this.pool = new Pool(config)

        this.config = config

        this.pool.on('error', (err) => {
            logger.error({ err }, 'PostgreSQL pool error')
        })
    }

    // eslint-disable-next-line class-methods-use-this
    async start(): Promise<void> {
        await database.query('SELECT 1', [])

        logger.info({ database: this.config.database }, 'PostgreSQL connection established')
    }

    async stop(): Promise<void> {
        await this.pool.end()
    }

    async query<ResultObject = any>(query: string, values?: QueryValue[], options?: OperationOptions) {
        try {
            const response = await this.pool.query(query, values !== undefined ? values : [])

            if (options?.showQuery) {
                logger.debug({ query }, 'Executed query')
            }

            return response.rows as ResultObject[]
        } catch (err) {
            logger.error({ err, query, values }, 'Query failed')
            throw err
        }
    }

    public async create<T = any>(tableName: string, object: Omit<T, 'id'>) {
        const keys = Object.keys(object)
            .map((key) => checkAndTransformKey(key))
            .join(', ')

        const values: any[] = Object.values(object)

        const query = `INSERT INTO ${checkAndTransformKey(
            tableName
        )} (${keys}) VALUES (${values.map((_, i) => `$${i + 1}`).join(', ')}) RETURNING *`

        const rows = await this.query<T>(query, values)

        return rows[0]
    }

    public async createOrIgnore<T = any>(
        tableName: string,
        object: Omit<T, 'id'>,
        conflictTarget: string
    ): Promise<T | undefined> {
        const keys = Object.keys(object)
            .map((key) => checkAndTransformKey(key))
            .join(', ')

        const values: any[] = Object.values(object)

        const query = `INSERT INTO ${checkAndTransformKey(tableName)} (${keys}) VALUES (${values
            .map((_, i) => `$${i + 1}`)
            .join(', ')}) ON CONFLICT (${checkAndTransformKey(conflictTarget)}) DO NOTHING RETURNING *`

        const rows = await this.query<T>(query, values)

        return rows[0]
    }

    public async edit<T>(tableName: string, object: Omit<Partial<T>, 'id'>, objectId: number) {
        const keys = Object.keys(object).map((key, index) => `${checkAndTransformKey(key)} = $${index + 1}`)

        const values: any[] = Object.values(object)

        const query = `UPDATE ${checkAndTransformKey(tableName)} SET ${keys} WHERE id = $${keys.length + 1} RETURNING *`

        const rows = await this.query<T>(query, [...values, objectId])

        return rows[0]
    }

    public async delete(tableName: string, itemId: number) {
        const query = `DELETE FROM ${checkAndTransformKey(tableName)} WHERE id = $1`

        await this.query<void>(query, [itemId])
    }
}

export const checkAndTransformKey = (key: string): string => {
    const protectedKeywords = ['key', 'table', 'group', 'from', 'desc', 'condition', 'before', 'grant', 'user', 'is']

    return protectedKeywords.includes(key) ? `"${key}"` : key
}

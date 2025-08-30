import { Pool } from 'pg'
import { database } from '..'

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

    constructor(config: DatabaseConfig) {
        this.pool = new Pool(config)

        this.pool.on('error', (err) => {
            console.error('Error:', err)
        })
    }

    // eslint-disable-next-line class-methods-use-this
    async start(): Promise<void> {
        await database.query('SELECT 1', [])

        console.log('PostgreSQL connection established successfully.')

        return undefined
    }

    async stop(): Promise<void> {
        await this.pool.end()
    }

    async query<ResultObject = any>(query: string, values?: QueryValue[], options?: OperationOptions) {
        const queryPromise = async (): Promise<ResultObject[]> => {
            return new Promise((resolve, reject) => {
                try {
                    this.pool.query(query, values !== undefined ? values : [], (error, response) => {
                        if (error) {
                            console.log('Failed query: ', query)
                            console.log('With these values: ', values)
                            console.log('error 1', error)
                            reject(error)
                            return
                        }

                        if (options && options.showQuery) {
                            console.log('Executed query: ', query)
                        }

                        const results = response.rows

                        try {
                            const responseData: ResultObject[] = JSON.parse(JSON.stringify(results))

                            if (!Array.isArray(responseData)) {
                                const parsedResponseData: ResultObject[] = [JSON.parse(JSON.stringify(results))]

                                resolve(parsedResponseData)
                            }

                            resolve(responseData)
                        } catch (error) {
                            console.log('query response: ', results)
                            console.log('catch error: ', error)
                            reject(error)
                            console.log('error 2', error)
                        }
                    })
                } catch (error) {
                    console.log('catch error: ', error)
                    console.log('error 3', error)
                    reject(error)
                }
            })
        }

        try {
            const rows = await queryPromise()

            return rows
        } catch (error: any) {
            throw new Error(error)
        }
    }
}

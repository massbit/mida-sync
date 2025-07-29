import { config } from './config/config'
import { startServer } from './server'
import PostgreSQL from './services/postgresql'

export let database: PostgreSQL

const app = async () => {
    try {
        await startServer()
        database = new PostgreSQL(config.database)
        await database.start()
    } catch (error) {
        console.error(error)
    }
}

app()

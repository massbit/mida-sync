import { config } from './config/config'
import { startServer } from './server'
import PostgreSQL from './services/postgresql'

export let database: PostgreSQL

const app = async () => {
    try {
        console.log('Starting application with configuration:', config)
        console.log('Node environment:', process.env.NODE_ENV)
        await startServer()
        database = new PostgreSQL(config.database)
        await database.start()
    } catch (error) {
        console.error(error)
    }
}

app()

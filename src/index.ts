import { startServer } from './server'

const app = async () => {
    try {
        await startServer()
    } catch (error) {
        console.error(error)
    }
}

app()

import { Cron } from 'croner'
import { runMeteoAlertCheck } from './tasks/meteo-alerts'
import { runPretempCheck } from './tasks/pretemp'
import { runEstofexCheck } from './tasks/estofex'
import logger from './logger'

const jobs: Cron[] = []

const schedule = (name: string, pattern: string, handler: () => Promise<unknown>) => {
    const log = logger.child({ task: name })

    const job = new Cron(
        pattern,
        {
            name,
            timezone: 'Europe/Rome',
            protect: true,
            catch: (err: unknown) => log.error({ err }, 'Scheduled task threw'),
        },
        async () => {
            log.info({ event: 'tick-start' })
            try {
                await handler()
                log.info({ event: 'tick-end' })
            } catch (err) {
                log.error({ err, event: 'tick-failed' }, 'Scheduled task failed')
            }
        }
    )

    jobs.push(job)
}

export const startScheduler = () => {
    schedule('meteo-alerts', '*/5 * * * *', runMeteoAlertCheck)
    schedule('pretemp', '*/5 * * * *', runPretempCheck)
    schedule('estofex', '*/5 * * * *', runEstofexCheck)

    logger.info({ count: jobs.length }, 'Scheduler started')
}

export const stopScheduler = () => {
    for (const job of jobs) {
        job.stop()
    }
    jobs.length = 0
    logger.info('Scheduler stopped')
}

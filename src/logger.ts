import pino from 'pino'

const level =
    process.env.LOG_LEVEL ??
    (process.env.NODE_ENV === 'test' ? 'silent' : process.env.NODE_ENV === 'production' ? 'info' : 'debug')

const logger = pino({
    level,
    base: {
        service: 'mida-sync',
    },
    formatters: {
        level: (label) => ({ level: label }),
    },
})

export default logger


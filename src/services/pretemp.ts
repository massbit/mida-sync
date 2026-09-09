import moment from 'moment'
import { http } from './http'
import customMoment from '../custom-components/custom-moment'
import logger from '../logger'

const BASE_URL = 'https://pretemp.it'

const fetchHtml = async (url: string) => {
    try {
        return (await http.get(url)).data as string
    } catch {
        return undefined
    }
}

export const getPretempReport = async (date: moment.Moment) => {
    const isoDate = date.format('YYYY-MM-DD')
    const archive = await fetchHtml(`${BASE_URL}/archivio/${date.year()}?date_from=${isoDate}&date_to=${isoDate}`)

    if (!archive) {
        logger.warn({ date: isoDate }, 'Pretemp archive unavailable')
        return undefined
    }

    // The archive lists both the forecast and the trend for the same day: only the forecast page carries the map.
    const forecastIds = [...new Set([...archive.matchAll(/\/previsioni\/(\d+)/g)].map((match) => match[1]))]

    for (const id of forecastIds) {
        const page = await fetchHtml(`${BASE_URL}/previsioni/${id}`)

        if (!page) {
            continue
        }

        const imageTag = (page.match(/<img\b[^>]*>/g) ?? []).find((tag) => /alt="Mappa previsione/.test(tag))
        const source = imageTag?.match(/src="([^"]+)"/)?.[1]

        if (source) {
            return source.startsWith('http') ? source : `${BASE_URL}${source}`
        }
    }

    logger.warn({ date: isoDate }, 'Pretemp report unavailable')
    return undefined
}

export const getTomorrowPretempReport = async () => {
    const tomorrow = customMoment().add(1, 'day')
    return getPretempReport(tomorrow)
}

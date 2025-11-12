import axios from 'axios'
import { XMLParser } from 'fast-xml-parser'
import logger from '../logger'

export interface EstofexReport {
    forecast?: Partial<{
        forecast_type: string
        start_time: Partial<{
            '@_value': string
        }>
        expiry_time: Partial<{
            '@_value': string
        }>
        issue_time: Partial<{
            '@_value': string
        }>
    }>
}

export const getEstofexReport = async () => {
    const xmlUrl = 'https://www.estofex.org/cgi-bin/polygon/showforecast.cgi?xml=yes'

    try {
        const xmlData = await axios.get(xmlUrl).then((response) => response.data)

        const parser = new XMLParser({
            ignoreAttributes: false,
        })

        return parser.parse(xmlData) as EstofexReport
    } catch (error) {
        logger.error({ err: error }, 'Failed to fetch Estofex report')
        throw error
    }
}

export const getEstofexImage = async () => {
    const imageUrl = 'https://www.estofex.org/forecasts/tempmap/.png'

    try {
        await axios.head(imageUrl)
    } catch (error) {
        logger.warn({ err: error }, 'Estofex image not available')
        throw new Error('Estofex image not available')
    }

    return imageUrl
}

import axios from 'axios'
import { XMLParser } from 'fast-xml-parser'

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

    const xmlData = await axios.get(xmlUrl).then((response) => response.data)

    const parser = new XMLParser({
        ignoreAttributes: false,
    })

    return parser.parse(xmlData) as EstofexReport
}

export const getEstofexImage = async () => {
    const imageUrl = 'https://www.estofex.org/forecasts/tempmap/.png'

    try {
        await axios.head(imageUrl)
    } catch {
        throw new Error('Estofex image not available')
    }

    return imageUrl
}

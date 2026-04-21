import { http } from './http'
import logger from '../logger'

export interface RiverSensorTimePoint {
    t: number
    v: number
}

const VARIABILE = '254,0,0/1,-,-,-/B13215'
const TIME_SERIES_BASE_URL = 'https://allertameteo.regione.emilia-romagna.it/o/api/allerta/get-time-series/'

export const getRiverSensorTimeSeries = async (stationId: string): Promise<RiverSensorTimePoint[]> => {
    const url = `${TIME_SERIES_BASE_URL}?stazione=${encodeURIComponent(stationId)}&variabile=${VARIABILE}`

    try {
        const response = await http.get<RiverSensorTimePoint[]>(url).then((res) => res.data)

        if (!Array.isArray(response)) {
            return []
        }

        return response.filter(
            (point): point is RiverSensorTimePoint =>
                point != null && typeof point.t === 'number' && typeof point.v === 'number'
        )
    } catch (error) {
        logger.error({ err: error, stationId }, 'Failed to retrieve river sensor time series')
        throw error
    }
}

export const getLatestRiverSensorValue = async (stationId: string): Promise<RiverSensorTimePoint | undefined> => {
    const series = await getRiverSensorTimeSeries(stationId)

    if (series.length === 0) {
        return undefined
    }

    return series.reduce((latest, point) => (point.t > latest.t ? point : latest), series[0])
}

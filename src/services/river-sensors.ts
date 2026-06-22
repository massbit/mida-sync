import { http } from './http'
import logger from '../logger'

export interface RiverSensorTimePoint {
    t: number
    v: number
}

export interface RawSensorStation {
    idstazione: string
    nomestaz: string
    lon: string
    lat: string
    value: number | null
    soglia1: number | null
    soglia2: number | null
    soglia3: number | null
}

const VARIABILE = '254,0,0/1,-,-,-/B13215'
const TIME_SERIES_BASE_URL = 'https://allertameteo.regione.emilia-romagna.it/o/api/allerta/get-time-series/'
const SENSOR_VALUES_BASE_URL =
    'https://allertameteo.regione.emilia-romagna.it/o/api/allerta/get-sensor-values-no-time'

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

/**
 * Fetches the full station list (one call, all hydrometric stations) used for discovery and
 * nearest-station lookup. Note: the per-station `value` is unreliable (often null) for this
 * variable, so this endpoint is NOT a substitute for the time-series readings — it is metadata
 * (name, coordinates, official thresholds) only. The leading `{ time }` element is dropped.
 */
export const getSensorStations = async (): Promise<RawSensorStation[]> => {
    const url = `${SENSOR_VALUES_BASE_URL}?variabile=${VARIABILE}`

    try {
        const response = await http.get<unknown[]>(url).then((res) => res.data)

        if (!Array.isArray(response)) {
            return []
        }

        return response.filter(
            (entry): entry is RawSensorStation =>
                entry != null && typeof (entry as RawSensorStation).idstazione === 'string'
        )
    } catch (error) {
        logger.error({ err: error }, 'Failed to retrieve river sensor station list')
        throw error
    }
}

import { RawSensorStation } from '../services/river-sensors'

export interface SensorStation {
    stationId: string
    name: string
    lat: number
    lon: number
    soglia1: number | null
    soglia2: number | null
    soglia3: number | null
}

export interface Coordinates {
    lat: number
    lon: number
}

export interface NearestStation extends SensorStation {
    distanceKm: number
}

// The Allerta Meteo sensor list encodes coordinates as integer strings scaled by 1e5
// (e.g. "4457480" -> 44.57480, "1170609" -> 11.70609).
const COORDINATE_SCALE = 100000

const parseCoordinate = (raw: string): number | null => {
    const value = Number(raw)

    return Number.isFinite(value) ? value / COORDINATE_SCALE : null
}

// A soglia of 0 means "no official threshold" for this variable (e.g. tide/coastal stations),
// so it is normalised to null rather than treated as a real 0 m threshold.
const parseThreshold = (raw: number | null): number | null => {
    if (raw == null) {
        return null
    }

    const value = Number(raw)

    return Number.isFinite(value) && value !== 0 ? value : null
}

export const parseSensorStations = (raw: RawSensorStation[]): SensorStation[] => {
    return raw.reduce<SensorStation[]>((acc, entry) => {
        const lat = parseCoordinate(entry.lat)
        const lon = parseCoordinate(entry.lon)

        if (lat == null || lon == null) {
            return acc
        }

        acc.push({
            stationId: entry.idstazione,
            name: entry.nomestaz,
            lat,
            lon,
            soglia1: parseThreshold(entry.soglia1),
            soglia2: parseThreshold(entry.soglia2),
            soglia3: parseThreshold(entry.soglia3),
        })

        return acc
    }, [])
}

const EARTH_RADIUS_KM = 6371

const toRadians = (degrees: number): number => (degrees * Math.PI) / 180

export const haversineKm = (a: Coordinates, b: Coordinates): number => {
    const dLat = toRadians(b.lat - a.lat)
    const dLon = toRadians(b.lon - a.lon)
    const lat1 = toRadians(a.lat)
    const lat2 = toRadians(b.lat)

    const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2

    return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h))
}

export const findNearestStations = (
    stations: SensorStation[],
    point: Coordinates,
    limit = 5
): NearestStation[] => {
    return stations
        .map((station) => ({ ...station, distanceKm: haversineKm(station, point) }))
        .sort((a, b) => a.distanceKm - b.distanceKm)
        .slice(0, Math.max(0, limit))
}

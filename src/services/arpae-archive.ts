import zlib from 'zlib'
import readline from 'readline'
import { http } from './http'
import logger from '../logger'

// ARPAE-SIMC open-data historical archive: one gzipped JSONL file per month, each line a station's
// observation at one timestamp. Hydrometric level is the measurement block with timerange[0] === 254
// carrying B13215 — the same signature as the live Allerta variable 254,0,0/1,-,-,-/B13215.
const ARCHIVE_BASE_URL = 'https://dati-simc.arpae.it/opendata/osservati/meteo/storico'

const HYDRO_TIMERANGE = 254
const LEVEL_VARIABLE = 'B13215'

export interface ArchiveTarget {
    riverId: number
    soglia1: number | null
    soglia2: number | null
    soglia3: number | null
}

export interface ParsedArchiveReading {
    river_id: number
    value: number
    measured_at: string
    soglia1_above: boolean | null
    soglia2_above: boolean | null
    soglia3_above: boolean | null
}

interface ArchiveBlock {
    timerange?: number[]
    vars?: Record<string, { v: unknown }>
}

interface ArchiveLine {
    lat?: number
    lon?: number
    date?: string
    data?: ArchiveBlock[]
}

// Stations are matched on the integer (lat, lon) coordinates, which the archive and the Allerta
// sensor list share (degrees × 1e5).
export const coordKey = (lat: number, lon: number): string => `${lat}:${lon}`

const aboveOrNull = (value: number, threshold: number | null): boolean | null =>
    threshold == null ? null : value > threshold

/**
 * Parses one archive JSONL line into a river_levels reading, or null when the line is not one of the
 * target stations, carries no hydrometric level, or is malformed. Pure — unit-testable without IO.
 */
export const parseArchiveLine = (line: string, index: Map<string, ArchiveTarget>): ParsedArchiveReading | null => {
    let parsed: ArchiveLine
    try {
        parsed = JSON.parse(line)
    } catch {
        return null
    }

    if (typeof parsed.lat !== 'number' || typeof parsed.lon !== 'number' || typeof parsed.date !== 'string') {
        return null
    }

    const target = index.get(coordKey(parsed.lat, parsed.lon))
    if (!target || !Array.isArray(parsed.data)) {
        return null
    }

    const block = parsed.data.find(
        (b) => Array.isArray(b.timerange) && b.timerange[0] === HYDRO_TIMERANGE && b.vars?.[LEVEL_VARIABLE] != null
    )
    const raw = block?.vars?.[LEVEL_VARIABLE]?.v
    const value = typeof raw === 'number' ? raw : Number(raw)

    if (raw == null || !Number.isFinite(value)) {
        return null
    }

    return {
        river_id: target.riverId,
        value,
        measured_at: new Date(parsed.date).toISOString(),
        soglia1_above: aboveOrNull(value, target.soglia1),
        soglia2_above: aboveOrNull(value, target.soglia2),
        soglia3_above: aboveOrNull(value, target.soglia3),
    }
}

export const archiveUrlForMonth = (year: number, month: number): string =>
    `${ARCHIVE_BASE_URL}/${year}-${String(month).padStart(2, '0')}.json.gz`

/**
 * Streams one monthly archive file, returning the readings that match the target stations. Holds
 * only the matched rows in memory (a few stations × ~2,976 readings/month), parsing line by line.
 */
export const fetchArchiveMonth = async (
    year: number,
    month: number,
    index: Map<string, ArchiveTarget>
): Promise<ParsedArchiveReading[]> => {
    const url = archiveUrlForMonth(year, month)
    const readings: ParsedArchiveReading[] = []

    // Archive files are ~20 MB; override the default 15s client timeout so the download/stream has
    // room to complete on a slow connection.
    const response = await http.get(url, { responseType: 'stream', timeout: 180_000 })
    const lines = readline.createInterface({
        input: (response.data as NodeJS.ReadableStream).pipe(zlib.createGunzip()),
        crlfDelay: Infinity,
    })

    try {
        for await (const line of lines) {
            if (line.length === 0) {
                continue
            }
            const reading = parseArchiveLine(line, index)
            if (reading) {
                readings.push(reading)
            }
        }
    } catch (error) {
        logger.error({ err: error, url }, 'Failed while streaming ARPAE archive month')
        throw error
    }

    return readings
}

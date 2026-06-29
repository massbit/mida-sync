import { getRivers } from '../models/river'
import { bulkInsertRiverLevels } from '../models/river-level'
import { getSensorStations } from '../services/river-sensors'
import { ArchiveTarget, coordKey, fetchArchiveMonth } from '../services/arpae-archive'
import logger from '../logger'

const log = logger.child({ task: 'flood-backfill' })

const INSERT_BATCH_SIZE = 5000

export interface FloodBackfillSummary {
    months: number
    fetched: number
    inserted: number
    targets: number
}

interface YearMonth {
    year: number
    month: number
}

const toNumberOrNull = (value: number | null): number | null => {
    if (value == null) {
        return null
    }
    const n = Number(value)
    return Number.isFinite(n) ? n : null
}

export const expandMonthRange = (from: string, to: string): YearMonth[] => {
    const [fy, fm] = from.split('-').map(Number)
    const [ty, tm] = to.split('-').map(Number)

    if (![fy, fm, ty, tm].every(Number.isFinite) || fm < 1 || fm > 12 || tm < 1 || tm > 12) {
        throw new Error(`Invalid month range: ${from}..${to}`)
    }

    const months: YearMonth[] = []
    let year = fy
    let month = fm
    while (year < ty || (year === ty && month <= tm)) {
        months.push({ year, month })
        month += 1
        if (month > 12) {
            month = 1
            year += 1
        }
    }

    return months
}

/**
 * Builds a coordinate -> river index from the registered rivers and the live Allerta sensor list.
 * Both the archive and the sensor list encode coordinates as the same degrees×1e5 integers, so the
 * raw integer strings are used as the join key.
 */
const buildCoordIndex = async (): Promise<Map<string, ArchiveTarget>> => {
    const [rivers, stations] = await Promise.all([getRivers(), getSensorStations()])
    const stationCoords = new Map(stations.map((s) => [s.idstazione, { lat: Number(s.lat), lon: Number(s.lon) }]))

    const index = new Map<string, ArchiveTarget>()
    for (const river of rivers) {
        const coords = stationCoords.get(river.station_id)
        if (!coords || !Number.isFinite(coords.lat) || !Number.isFinite(coords.lon)) {
            log.warn({ riverId: river.id, stationId: river.station_id }, 'No archive coordinates for station; skipping')
            continue
        }

        index.set(coordKey(coords.lat, coords.lon), {
            riverId: river.id,
            soglia1: toNumberOrNull(river.soglia1),
            soglia2: toNumberOrNull(river.soglia2),
            soglia3: toNumberOrNull(river.soglia3),
        })
    }

    return index
}

const insertInBatches = async (readings: Parameters<typeof bulkInsertRiverLevels>[0]): Promise<number> => {
    let inserted = 0
    for (let i = 0; i < readings.length; i += INSERT_BATCH_SIZE) {
        inserted += await bulkInsertRiverLevels(readings.slice(i, i + INSERT_BATCH_SIZE))
    }
    return inserted
}

/**
 * Backfills river_levels from the ARPAE historical archive for every registered station over the
 * inclusive month range (e.g. "2020-01".."2024-12"). Idempotent: existing (river_id, measured_at)
 * rows are skipped, so it is safe to re-run. Run on demand, then trigger calibration afterwards.
 */
export const runFloodBackfill = async (from: string, to: string): Promise<FloodBackfillSummary> => {
    const months = expandMonthRange(from, to)
    const index = await buildCoordIndex()
    const summary: FloodBackfillSummary = { months: months.length, fetched: 0, inserted: 0, targets: index.size }

    if (index.size === 0) {
        log.warn('No target stations resolved; nothing to backfill')
        return summary
    }

    for (const { year, month } of months) {
        try {
            const readings = await fetchArchiveMonth(year, month, index)
            const inserted = await insertInBatches(readings)
            summary.fetched += readings.length
            summary.inserted += inserted
            log.info({ year, month, fetched: readings.length, inserted }, 'Backfilled archive month')
        } catch (err) {
            log.error({ err, year, month }, 'Failed to backfill archive month; continuing')
        }
    }

    return summary
}

import { getRiverById } from '../models/river'
import { getRiverLevelsSince } from '../models/river-level'
import { getRiverLinks, updateRiverLinkModel } from '../models/river-link'
import { calibrateLink, isLinkActive, toReadings } from '../utilities/flood-prediction'
import logger from '../logger'

const log = logger.child({ task: 'flood-calibration' })

const EPOCH_START = '1970-01-01T00:00:00.000Z'

export interface FloodCalibrationSummary {
    calibrated: number
    active: number
    skipped: number
}

const thresholdFor = (
    river: { soglia1: number | null; soglia2: number | null; soglia3: number | null },
    target: number
): number | null => {
    const raw = target === 1 ? river.soglia1 : target === 2 ? river.soglia2 : target === 3 ? river.soglia3 : null

    return raw == null ? null : Number(raw)
}

/**
 * Re-learns every link's model from the readings accumulated in river_levels. Safe to run
 * repeatedly; links without enough historical events simply stay inactive (sample_size below the
 * minimum). Intended to run on a slow schedule (e.g. daily) and on demand after a backfill.
 */
export const runFloodCalibration = async (): Promise<FloodCalibrationSummary> => {
    const links = await getRiverLinks()
    const summary: FloodCalibrationSummary = { calibrated: 0, active: 0, skipped: 0 }

    for (const link of links) {
        try {
            const downstream = await getRiverById(link.downstream_river_id)
            const upstream = await getRiverById(link.upstream_river_id)

            if (!downstream || !upstream) {
                summary.skipped += 1
                continue
            }

            const threshold = thresholdFor(downstream, link.target_threshold)

            if (threshold == null) {
                log.warn({ linkId: link.id, downstreamId: downstream.id }, 'Downstream soglia not set; skipping link')
                summary.skipped += 1
                continue
            }

            const [downstreamRows, upstreamRows] = await Promise.all([
                getRiverLevelsSince(link.downstream_river_id, EPOCH_START),
                getRiverLevelsSince(link.upstream_river_id, EPOCH_START),
            ])

            const model = calibrateLink(toReadings(upstreamRows), toReadings(downstreamRows), threshold)

            await updateRiverLinkModel(link.id, {
                lead_time_minutes: Number.isFinite(model.leadTimeMinutes) ? Math.round(model.leadTimeMinutes) : null,
                precursor_level: Number.isFinite(model.precursorLevel) ? model.precursorLevel : null,
                sample_size: model.sampleSize,
                model_json: model,
            })

            summary.calibrated += 1
            if (isLinkActive(model)) {
                summary.active += 1
            }

            log.info(
                { linkId: link.id, sampleSize: model.sampleSize, active: isLinkActive(model) },
                'Calibrated flood link'
            )
        } catch (err) {
            log.error({ err, linkId: link.id }, 'Failed to calibrate flood link; continuing')
            summary.skipped += 1
        }
    }

    return summary
}

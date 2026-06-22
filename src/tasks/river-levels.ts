import { getRivers } from '../models/river'
import { createRiverLevelIfNew, getLatestRiverLevel } from '../models/river-level'
import { getLatestRiverSensorValue } from '../services/river-sensors'
import { detectThresholdCrossings, getActiveThresholds, ThresholdBooleans } from '../utilities/river-sensors'
import { sendRiverLevelCrossingMessage } from '../utilities/telegram'
import { config } from '../config/config'
import logger from '../logger'

const log = logger.child({ task: 'river-levels' })

export interface RiverLevelCheckSummary {
    checked: number
    crossings: number
    skipped: number
    unchanged: number
}

export const runRiverLevelCheck = async (): Promise<RiverLevelCheckSummary> => {
    const rivers = await getRivers()
    const summary: RiverLevelCheckSummary = { checked: 0, crossings: 0, skipped: 0, unchanged: 0 }

    if (rivers.length === 0) {
        return summary
    }

    for (const river of rivers) {
        // Isolate per-river failures (a sensor fetch or DB error for one station must not abort the
        // whole run); the scheduler would otherwise only retry on the next tick.
        try {
            const latest = await getLatestRiverSensorValue(river.station_id)

            if (!latest) {
                summary.skipped += 1
                continue
            }

            const previous = await getLatestRiverLevel(river.id)

            // The reading window is polled more frequently than the sensor publishes, so skip when
            // the latest reading is not newer than the one already stored — avoids duplicate rows
            // and redundant crossing evaluation.
            if (previous && latest.t <= new Date(previous.measured_at).getTime()) {
                summary.unchanged += 1
                continue
            }

            const currentValue = Number(latest.v)
            const thresholds = getActiveThresholds(river)
            const previousState: ThresholdBooleans | undefined = previous
                ? {
                      soglia1_above: previous.soglia1_above,
                      soglia2_above: previous.soglia2_above,
                      soglia3_above: previous.soglia3_above,
                  }
                : undefined

            const { crossings, nextState } = detectThresholdCrossings(
                currentValue,
                thresholds,
                previousState,
                config.river_threshold_margin
            )

            const inserted = await createRiverLevelIfNew({
                river_id: river.id,
                value: currentValue,
                measured_at: new Date(latest.t).toISOString(),
                soglia1_above: nextState.soglia1_above,
                soglia2_above: nextState.soglia2_above,
                soglia3_above: nextState.soglia3_above,
            })

            // A concurrent run may have already persisted this reading; only alert for the run that
            // actually stored it, so a crossing is never announced twice.
            if (!inserted) {
                summary.unchanged += 1
                continue
            }

            for (const crossing of crossings) {
                try {
                    await sendRiverLevelCrossingMessage(river, crossing, currentValue)
                    summary.crossings += 1
                } catch (err) {
                    log.error(
                        { err, riverId: river.id, stationId: river.station_id, threshold: crossing.threshold.key },
                        'Failed to send river level crossing Telegram message'
                    )
                }
            }

            summary.checked += 1
        } catch (err) {
            log.error({ err, riverId: river.id, stationId: river.station_id }, 'Failed to process river; continuing')
            summary.skipped += 1
        }
    }

    return summary
}

import { getRivers } from '../models/river'
import { createRiverLevel, getLatestRiverLevel } from '../models/river-level'
import { getLatestRiverSensorValue } from '../services/river-sensors'
import { detectThresholdCrossings, getActiveThresholds, ThresholdBooleans } from '../utilities/river-sensors'
import { sendRiverLevelCrossingMessage } from '../utilities/telegram'
import logger from '../logger'

const log = logger.child({ task: 'river-levels' })

export interface RiverLevelCheckSummary {
    checked: number
    crossings: number
    skipped: number
}

export const runRiverLevelCheck = async (): Promise<RiverLevelCheckSummary> => {
    const rivers = await getRivers()
    const summary: RiverLevelCheckSummary = { checked: 0, crossings: 0, skipped: 0 }

    if (rivers.length === 0) {
        return summary
    }

    for (const river of rivers) {
        const latest = await getLatestRiverSensorValue(river.station_id).catch((err) => {
            log.error({ err, stationId: river.station_id, riverId: river.id }, 'Failed to fetch latest river sensor value')
            return undefined
        })

        if (!latest) {
            summary.skipped += 1
            continue
        }

        const currentValue = Number(latest.v)
        const thresholds = getActiveThresholds(river)
        const previous = await getLatestRiverLevel(river.id)
        const previousState: ThresholdBooleans | undefined = previous
            ? {
                  soglia1_above: previous.soglia1_above,
                  soglia2_above: previous.soglia2_above,
                  soglia3_above: previous.soglia3_above,
              }
            : undefined

        const { crossings, nextState } = detectThresholdCrossings(currentValue, thresholds, previousState)

        await createRiverLevel({
            river_id: river.id,
            value: currentValue,
            measured_at: new Date(latest.t).toISOString(),
            soglia1_above: nextState.soglia1_above,
            soglia2_above: nextState.soglia2_above,
            soglia3_above: nextState.soglia3_above,
        })

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
    }

    return summary
}

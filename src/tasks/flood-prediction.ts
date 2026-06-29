import { getRiverById, River } from '../models/river'
import { getRiverLevelsSince } from '../models/river-level'
import { getRiverLinks } from '../models/river-link'
import { createLinkPrediction, getLatestLinkPrediction } from '../models/link-prediction'
import { LinkModel, predict, toReadings } from '../utilities/flood-prediction'
import { sendFloodPredictionMessage } from '../utilities/telegram'
import logger from '../logger'

const log = logger.child({ task: 'flood-prediction' })

const RECENT_WINDOW_MINUTES = 6 * 60
const MIN_DEDUP_MINUTES = 180
const MINUTE_MS = 60_000

export interface FloodPredictionSummary {
    evaluated: number
    predictions: number
    skipped: number
}

const modelFromLink = (link: {
    lead_time_minutes: number | null
    precursor_level: number | null
    sample_size: number
}): LinkModel => ({
    leadTimeMinutes: link.lead_time_minutes ?? NaN,
    precursorLevel: link.precursor_level == null ? NaN : Number(link.precursor_level),
    sampleSize: link.sample_size,
    leadSpreadMinutes: NaN,
})

/**
 * Online step (runs on the fast cron): for each calibrated link, checks whether the upstream gauge
 * has reached the learned precursor level while rising and, if so, emits a single flood-arrival
 * prediction. De-duplicates so a sustained high upstream level does not re-fire every poll.
 */
export const runFloodPrediction = async (): Promise<FloodPredictionSummary> => {
    const links = await getRiverLinks()
    const summary: FloodPredictionSummary = { evaluated: 0, predictions: 0, skipped: 0 }
    const nowMs = Date.now()
    const since = new Date(nowMs - RECENT_WINDOW_MINUTES * MINUTE_MS).toISOString()

    for (const link of links) {
        summary.evaluated += 1

        // Isolate per-link failures (a DB read for one link must not abort the whole run).
        try {
            const model = modelFromLink(link)
            const upstreamRows = await getRiverLevelsSince(link.upstream_river_id, since)
            const prediction = predict(toReadings(upstreamRows), model, nowMs)

            if (!prediction) {
                continue
            }

            // Suppress repeats while the upstream stays high: one warning per lead-time-sized window.
            const dedupMinutes = Math.max(model.leadTimeMinutes, MIN_DEDUP_MINUTES)
            const previous = await getLatestLinkPrediction(link.id)
            if (previous && nowMs - new Date(previous.predicted_at).getTime() < dedupMinutes * MINUTE_MS) {
                summary.skipped += 1
                continue
            }

            const [downstream, upstream] = await Promise.all([
                getRiverById(link.downstream_river_id),
                getRiverById(link.upstream_river_id),
            ])

            if (!downstream || !upstream) {
                summary.skipped += 1
                continue
            }

            // Send first, persist on success: a transient Telegram failure then retries on the next
            // poll instead of being permanently suppressed by the de-dup check above.
            await sendFloodPredictionMessage(downstream as River, upstream as River, {
                upstreamValue: prediction.upstreamValue,
                leadTimeMinutes: prediction.leadTimeMinutes,
                predictedExceedanceAt: prediction.predictedExceedanceAt,
                targetThreshold: link.target_threshold,
            })

            await createLinkPrediction({
                link_id: link.id,
                predicted_at: new Date(nowMs).toISOString(),
                predicted_exceedance_at: new Date(prediction.predictedExceedanceAt).toISOString(),
                upstream_value: prediction.upstreamValue,
            })

            summary.predictions += 1
        } catch (err) {
            log.error({ err, linkId: link.id }, 'Failed to evaluate flood link; continuing')
            summary.skipped += 1
        }
    }

    return summary
}

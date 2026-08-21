/**
 * Empirical "precursor-of-exceedance" flood model.
 *
 * For a downstream point of interest we learn, purely from history, the upstream-gauge level
 * (`precursorLevel`) and the time offset (`leadTimeMinutes`) that preceded a threshold exceedance
 * downstream. Online, when the upstream gauge reaches that learned level while rising, we warn
 * that the downstream point is likely to exceed its threshold roughly one lead time later.
 *
 * No AI/regression — just event detection plus robust statistics over past events. The model is
 * deliberately conservative on `precursorLevel` (a low percentile of pre-event upstream peaks) so
 * it tends to catch events at the cost of some false positives; that only holds once the events the
 * upstream gauge did not drive have been dropped (see `minObservationRank` in {@link calibrateLink}). The lead time is measured from the
 * upstream peak to the downstream onset, so the online prediction (triggered while the upstream is
 * still rising) is slightly early-biased; the prediction-scoring feedback loop corrects this drift.
 */

export interface Reading {
    measuredAt: number // epoch ms
    value: number
}

export interface ExceedanceEvent {
    onsetAt: number
    peakAt: number
    peakValue: number
}

export interface PrecursorObservation {
    leadMinutes: number
    upstreamPeak: number
}

export interface LinkModel {
    leadTimeMinutes: number
    precursorLevel: number
    sampleSize: number
    leadSpreadMinutes: number
    /**
     * Where `precursorLevel` sits in the upstream gauge's own history (0..1). Recorded for
     * observability: a trustworthy precursor is a rare level for that gauge.
     */
    precursorRank?: number
    /** Events dropped as not driven by this upstream gauge (see `minObservationRank`). */
    discardedObservations?: number
    /** Set when a guard invalidated the model; lead/precursor are then NaN so the link stays inactive. */
    rejectedReason?: string
}

export interface Prediction {
    predictedExceedanceAt: number // epoch ms
    leadTimeMinutes: number
    upstreamValue: number
}

export interface FloodModelOptions {
    maxLookbackMinutes: number
    minLeadMinutes: number
    minSamples: number
    precursorPercentile: number
    minSeparationMinutes: number
    maxLeadFraction: number
    minObservationRank: number
}

export const DEFAULT_FLOOD_OPTIONS: FloodModelOptions = {
    maxLookbackMinutes: 48 * 60,
    minLeadMinutes: 15,
    minSamples: 3,
    precursorPercentile: 0.25,
    // Treat brief dips back under the threshold as part of the same flood, so one flood is one
    // event (not many micro-events when the level hugs the threshold).
    minSeparationMinutes: 6 * 60,
    // A learned lead time may not consume most of the lookback window (see calibrateLink).
    maxLeadFraction: 0.8,
    // An event only counts if the upstream gauge was itself in the top decile of its own history
    // when it peaked (see calibrateLink).
    minObservationRank: 0.9,
}

const MINUTE_MS = 60_000

const sortByTime = (readings: Reading[]): Reading[] => [...readings].sort((a, b) => a.measuredAt - b.measuredAt)

export const median = (values: number[]): number => percentile(values, 0.5)

export const percentile = (values: number[], p: number): number => {
    if (values.length === 0) {
        return NaN
    }

    const sorted = [...values].sort((a, b) => a - b)
    const rank = Math.min(Math.max(p, 0), 1) * (sorted.length - 1)
    const low = Math.floor(rank)
    const high = Math.ceil(rank)

    if (low === high) {
        return sorted[low]
    }

    return sorted[low] + (sorted[high] - sorted[low]) * (rank - low)
}

/** Fraction of `readings` at or below `level` — how ordinary that level is for this gauge. */
const rankOf = (readings: Reading[], level: number): number =>
    readings.length === 0 ? NaN : readings.filter((r) => r.value <= level).length / readings.length

/**
 * Splits a level series into maximal runs strictly above `threshold`. Each run yields one event
 * with its onset (first sample above), peak time and peak value.
 */
export const detectExceedanceEvents = (
    series: Reading[],
    threshold: number,
    minSeparationMinutes = 0
): ExceedanceEvent[] => {
    const sorted = sortByTime(series)
    const separationMs = minSeparationMinutes * MINUTE_MS
    const events: ExceedanceEvent[] = []
    let current: ExceedanceEvent | null = null
    let belowSince: number | null = null

    for (const point of sorted) {
        if (point.value > threshold) {
            belowSince = null
            if (!current) {
                current = { onsetAt: point.measuredAt, peakAt: point.measuredAt, peakValue: point.value }
            } else if (point.value > current.peakValue) {
                current.peakValue = point.value
                current.peakAt = point.measuredAt
            }
        } else if (current) {
            // Only close the event once the level has stayed below the threshold for at least the
            // separation window; shorter dips are absorbed into the same flood.
            if (belowSince === null) {
                belowSince = point.measuredAt
            }
            if (point.measuredAt - belowSince >= separationMs) {
                events.push(current)
                current = null
                belowSince = null
            }
        }
    }

    if (current) {
        events.push(current)
    }

    return events
}

/**
 * Finds the upstream peak in the lookback window before a downstream event and the lead time from
 * that peak to the event onset. Returns null when there is no usable upstream data in the window
 * or the lead is below the minimum.
 */
export const findPrecursor = (
    upstream: Reading[],
    event: ExceedanceEvent,
    options: FloodModelOptions = DEFAULT_FLOOD_OPTIONS
): PrecursorObservation | null => {
    const windowStart = event.onsetAt - options.maxLookbackMinutes * MINUTE_MS
    const candidates = upstream.filter((p) => p.measuredAt >= windowStart && p.measuredAt <= event.onsetAt)

    if (candidates.length === 0) {
        return null
    }

    const peak = candidates.reduce((best, p) => (p.value > best.value ? p : best), candidates[0])
    const leadMinutes = (event.onsetAt - peak.measuredAt) / MINUTE_MS

    if (leadMinutes < options.minLeadMinutes) {
        return null
    }

    return { leadMinutes, upstreamPeak: peak.value }
}

/**
 * Learns a link model from upstream readings and the downstream level series. `sampleSize` is the
 * number of usable historical events; the model is only meaningful once it reaches `minSamples`
 * (see {@link isLinkActive}).
 */
export const calibrateLink = (
    upstream: Reading[],
    downstream: Reading[],
    threshold: number,
    options: FloodModelOptions = DEFAULT_FLOOD_OPTIONS
): LinkModel => {
    const events = detectExceedanceEvents(downstream, threshold, options.minSeparationMinutes)
    const candidateObservations = events
        .map((event) => findPrecursor(upstream, event, options))
        .filter((obs): obs is PrecursorObservation => obs !== null)

    // Drop the events this upstream gauge demonstrably did not drive: if its peak in the lookback
    // window was an ordinary level for it, the downstream exceedance came from somewhere else, and
    // keeping it drags `precursorLevel` down into baseline flow. Real case: Portonovo brushes its
    // 10.3 m soglia1 on regulated summer levels, and 11 of its 52 exceedance days had Sesto Imolese
    // sitting at 7.04 m — which pulled the learned precursor to 7.05 m, a level the gauge is above
    // three quarters of the time.
    const minCausalPeak = percentile(
        upstream.map((r) => r.value),
        options.minObservationRank
    )
    const observations = candidateObservations.filter((o) => o.upstreamPeak >= minCausalPeak)

    const leads = observations.map((o) => o.leadMinutes)
    const peaks = observations.map((o) => o.upstreamPeak)

    const model: LinkModel = {
        sampleSize: observations.length,
        leadTimeMinutes: observations.length > 0 ? median(leads) : NaN,
        precursorLevel: observations.length > 0 ? percentile(peaks, options.precursorPercentile) : NaN,
        leadSpreadMinutes:
            observations.length > 0 ? percentile(leads, 0.75) - percentile(leads, 0.25) : NaN,
        precursorRank: observations.length > 0 ? rankOf(upstream, percentile(peaks, options.precursorPercentile)) : NaN,
        discardedObservations: candidateObservations.length - observations.length,
    }

    // `findPrecursor` returns the maximum of the lookback window, whether or not that maximum is a
    // real flood peak. When the upstream gauge carries no signal for this downstream point, the
    // maximum lands wherever baseline noise happens to be highest — typically near the far edge of
    // the window — so the learned lead saturates towards `maxLookbackMinutes` and the learned
    // precursor level collapses onto ordinary flow. Reject that: it is the same degenerate fit as
    // Gallo -> Gandazzolo (lead 0), only with the lead pinned at the other end of the window.
    if (model.leadTimeMinutes > options.maxLeadFraction * options.maxLookbackMinutes) {
        return {
            ...model,
            leadTimeMinutes: NaN,
            precursorLevel: NaN,
            rejectedReason: `lead time ${Math.round(model.leadTimeMinutes)}min saturates the ${options.maxLookbackMinutes}min lookback window`,
        }
    }

    return model
}

export const isLinkActive = (model: LinkModel, options: FloodModelOptions = DEFAULT_FLOOD_OPTIONS): boolean =>
    model.sampleSize >= options.minSamples &&
    Number.isFinite(model.leadTimeMinutes) &&
    Number.isFinite(model.precursorLevel)

const isRising = (readings: Reading[]): boolean => {
    if (readings.length < 2) {
        // A single reading cannot establish an upward trend (e.g. first poll after a cold start or
        // sensor outage), so do not fire a prediction from it.
        return false
    }

    return readings[readings.length - 1].value > readings[readings.length - 2].value
}

/**
 * Converts stored river_levels rows into the time/value Reading shape used by this module. Accepts
 * the value as string or number because node-postgres returns NUMERIC columns as strings.
 */
export const toReadings = (rows: { value: number | string; measured_at: string }[]): Reading[] =>
    rows.map((row) => ({ value: Number(row.value), measuredAt: new Date(row.measured_at).getTime() }))

/**
 * Emits a prediction when the most recent upstream reading has reached the learned precursor level
 * while rising. Returns null otherwise (model inactive, below precursor, or receding).
 */
export const predict = (
    upstreamReadings: Reading[],
    model: LinkModel,
    nowMs: number,
    options: FloodModelOptions = DEFAULT_FLOOD_OPTIONS
): Prediction | null => {
    if (!isLinkActive(model, options) || upstreamReadings.length === 0) {
        return null
    }

    const sorted = sortByTime(upstreamReadings)
    const latest = sorted[sorted.length - 1]

    if (latest.value < model.precursorLevel || !isRising(sorted)) {
        return null
    }

    return {
        predictedExceedanceAt: nowMs + model.leadTimeMinutes * MINUTE_MS,
        leadTimeMinutes: model.leadTimeMinutes,
        upstreamValue: latest.value,
    }
}

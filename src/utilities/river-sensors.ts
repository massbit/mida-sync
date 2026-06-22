import { River } from '../models/river'

export type ThresholdKey = 'soglia1' | 'soglia2' | 'soglia3'

export interface ActiveThreshold {
    key: ThresholdKey
    value: number
}

export interface ThresholdCrossing {
    threshold: ActiveThreshold
    direction: 'above' | 'below'
}

export interface ThresholdBooleans {
    soglia1_above: boolean | null
    soglia2_above: boolean | null
    soglia3_above: boolean | null
}

export interface CrossingDetectionResult {
    crossings: ThresholdCrossing[]
    nextState: ThresholdBooleans
}

const THRESHOLD_KEYS: ThresholdKey[] = ['soglia1', 'soglia2', 'soglia3']

export const getActiveThresholds = (river: River): ActiveThreshold[] => {
    return THRESHOLD_KEYS.reduce<ActiveThreshold[]>((acc, key) => {
        const raw = river[key]
        const value = raw == null ? null : Number(raw)

        if (value != null && Number.isFinite(value)) {
            acc.push({ key, value })
        }

        return acc
    }, [])
}

/**
 * Detects threshold crossings with an optional hysteresis `margin` (deadband) to avoid alert
 * flapping when a reading hovers around a threshold. With the default margin of 0 this reduces
 * exactly to a strict `value > threshold` comparison.
 *
 * Schmitt-trigger semantics once a previous side is known:
 * - while above, the level must drop to `threshold - margin` before it counts as below;
 * - while below, the level must exceed `threshold + margin` before it counts as above.
 * The first observation (no previous side) is seeded with a plain comparison and emits no crossing.
 */
export const detectThresholdCrossings = (
    currentValue: number,
    thresholds: ActiveThreshold[],
    previousState: ThresholdBooleans | undefined,
    margin = 0
): CrossingDetectionResult => {
    const nextState: ThresholdBooleans = {
        soglia1_above: null,
        soglia2_above: null,
        soglia3_above: null,
    }
    const crossings: ThresholdCrossing[] = []

    for (const threshold of thresholds) {
        const aboveKey = `${threshold.key}_above` as keyof ThresholdBooleans
        const previousAbove = previousState?.[aboveKey] ?? null

        let currentAbove: boolean
        if (previousAbove === null) {
            currentAbove = currentValue > threshold.value
        } else if (previousAbove) {
            currentAbove = currentValue > threshold.value - margin
        } else {
            currentAbove = currentValue > threshold.value + margin
        }

        nextState[aboveKey] = currentAbove

        if (previousState && previousAbove !== null && previousAbove !== currentAbove) {
            crossings.push({
                threshold,
                direction: currentAbove ? 'above' : 'below',
            })
        }
    }

    return { crossings, nextState }
}

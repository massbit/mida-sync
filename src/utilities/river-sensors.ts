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

export const detectThresholdCrossings = (
    currentValue: number,
    thresholds: ActiveThreshold[],
    previousState: ThresholdBooleans | undefined
): CrossingDetectionResult => {
    const nextState: ThresholdBooleans = {
        soglia1_above: null,
        soglia2_above: null,
        soglia3_above: null,
    }
    const crossings: ThresholdCrossing[] = []

    for (const threshold of thresholds) {
        const currentAbove = currentValue > threshold.value
        const aboveKey = `${threshold.key}_above` as keyof ThresholdBooleans
        nextState[aboveKey] = currentAbove

        const previousAbove = previousState?.[aboveKey] ?? null

        if (previousState && previousAbove !== null && previousAbove !== currentAbove) {
            crossings.push({
                threshold,
                direction: currentAbove ? 'above' : 'below',
            })
        }
    }

    return { crossings, nextState }
}

// Environment-variable helpers shared by the per-environment config objects. Kept in its own
// module (importing nothing from ./config) so it does not create a runtime import cycle.

const DEFAULT_RIVER_THRESHOLD_MARGIN = 0.05

/**
 * Hysteresis deadband (in metres) applied around river thresholds to avoid alert flapping.
 * Falls back to a small default when RIVER_THRESHOLD_MARGIN is unset or invalid.
 */
export const getRiverThresholdMargin = (): number => {
    const raw = process.env.RIVER_THRESHOLD_MARGIN

    // Treat unset/blank as "use the default" — Number('') is 0, which would silently disable the
    // deadband rather than fall back.
    if (raw === undefined || raw.trim() === '') {
        return DEFAULT_RIVER_THRESHOLD_MARGIN
    }

    const margin = Number(raw)

    return Number.isFinite(margin) && margin >= 0 ? margin : DEFAULT_RIVER_THRESHOLD_MARGIN
}

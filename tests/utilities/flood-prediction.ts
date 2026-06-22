import { expect } from 'chai'
import { describe, it } from 'mocha'
import {
    calibrateLink,
    detectExceedanceEvents,
    findPrecursor,
    isLinkActive,
    LinkModel,
    median,
    percentile,
    predict,
    Reading,
} from '../../src/utilities/flood-prediction'

const T0 = new Date('2026-01-01T00:00:00.000Z').getTime()
const MIN = 60_000
const DAY = 24 * 60 * MIN

const at = (offsetMin: number, value: number): Reading => ({ measuredAt: T0 + offsetMin * MIN, value })

describe('tests/utilities/flood-prediction', () => {
    describe('percentile / median', () => {
        it('interpolates percentiles and computes the median', () => {
            expect(median([1, 2, 3])).to.equal(2)
            expect(median([1, 2, 3, 4])).to.equal(2.5)
            expect(percentile([5, 5.5, 6], 0.25)).to.be.closeTo(5.25, 1e-9)
            expect(percentile([], 0.5)).to.be.NaN
        })
    })

    describe('detectExceedanceEvents', () => {
        it('returns no events when the series never exceeds the threshold', () => {
            expect(detectExceedanceEvents([at(0, 5), at(15, 6), at(30, 7)], 10)).to.deep.equal([])
        })

        it('captures a single run with its onset and peak', () => {
            const events = detectExceedanceEvents([at(0, 9), at(15, 11), at(30, 13), at(45, 12), at(60, 8)], 10)

            expect(events).to.have.length(1)
            expect(events[0].onsetAt).to.equal(T0 + 15 * MIN)
            expect(events[0].peakAt).to.equal(T0 + 30 * MIN)
            expect(events[0].peakValue).to.equal(13)
        })

        it('separates two runs split by a drop below the threshold', () => {
            const events = detectExceedanceEvents([at(0, 11), at(15, 9), at(30, 12), at(45, 8)], 10)

            expect(events.map((e) => e.onsetAt)).to.deep.equal([T0, T0 + 30 * MIN])
        })

        it('closes an event that is still above the threshold at the end of the series', () => {
            const events = detectExceedanceEvents([at(0, 9), at(15, 11), at(30, 12)], 10)

            expect(events).to.have.length(1)
            expect(events[0].peakValue).to.equal(12)
        })
    })

    describe('findPrecursor', () => {
        const event = { onsetAt: T0 + 600 * MIN, peakAt: T0 + 610 * MIN, peakValue: 12 }

        it('finds the upstream peak in the window and the lead to onset', () => {
            const upstream = [at(420, 4), at(480, 6), at(540, 5)] // peak 6 at +480, onset at +600 -> 120 min lead
            const result = findPrecursor(upstream, event)

            expect(result).to.not.equal(null)
            expect(result?.upstreamPeak).to.equal(6)
            expect(result?.leadMinutes).to.equal(120)
        })

        it('returns null when there is no upstream data in the lookback window', () => {
            expect(findPrecursor([at(0, 4)], event, { maxLookbackMinutes: 60, minLeadMinutes: 15, minSamples: 3, precursorPercentile: 0.25 })).to.equal(null)
        })

        it('returns null when the lead is below the minimum', () => {
            const upstream = [at(595, 6)] // only 5 min before onset
            expect(findPrecursor(upstream, event)).to.equal(null)
        })
    })

    describe('calibrateLink', () => {
        // Three downstream exceedance events spaced 3 days apart (> 48h lookback) so each upstream
        // peak only falls inside its own event's window.
        const buildPair = (dayOffset: number, leadMin: number, upstreamPeak: number) => {
            const onset = dayOffset * DAY
            const onsetMin = onset / MIN
            return {
                downstream: [at(onsetMin - 30, 9), at(onsetMin, 11), at(onsetMin + 30, 12), at(onsetMin + 60, 8)],
                upstream: [
                    at(onsetMin - leadMin - 60, upstreamPeak - 2),
                    at(onsetMin - leadMin, upstreamPeak),
                    at(onsetMin - leadMin + 30, upstreamPeak - 1),
                ],
            }
        }

        const e1 = buildPair(2, 120, 5)
        const e2 = buildPair(5, 150, 6)
        const e3 = buildPair(8, 135, 5.5)
        const downstream = [...e1.downstream, ...e2.downstream, ...e3.downstream]
        const upstream = [...e1.upstream, ...e2.upstream, ...e3.upstream]

        it('learns lead time and precursor level from historical events', () => {
            const model = calibrateLink(upstream, downstream, 10)

            expect(model.sampleSize).to.equal(3)
            expect(model.leadTimeMinutes).to.equal(135) // median of [120,150,135]
            expect(model.precursorLevel).to.be.closeTo(5.25, 1e-9) // 25th pct of [5,5.5,6]
            expect(isLinkActive(model)).to.equal(true)
        })

        it('stays inactive when there are fewer than minSamples events', () => {
            const model = calibrateLink(e1.upstream, e1.downstream, 10)

            expect(model.sampleSize).to.equal(1)
            expect(isLinkActive(model)).to.equal(false)
        })
    })

    describe('predict', () => {
        const model: LinkModel = { leadTimeMinutes: 135, precursorLevel: 5.25, sampleSize: 3, leadSpreadMinutes: 30 }
        const now = T0 + 1000 * MIN

        it('predicts an arrival when the upstream reaches the precursor level while rising', () => {
            const prediction = predict([at(960, 5.0), at(990, 5.3)], model, now)

            expect(prediction).to.not.equal(null)
            expect(prediction?.predictedExceedanceAt).to.equal(now + 135 * MIN)
            expect(prediction?.upstreamValue).to.equal(5.3)
        })

        it('returns null when the upstream is below the precursor level', () => {
            expect(predict([at(960, 4.9), at(990, 5.0)], model, now)).to.equal(null)
        })

        it('returns null when the upstream is receding even if above the precursor level', () => {
            expect(predict([at(960, 5.6), at(990, 5.3)], model, now)).to.equal(null)
        })

        it('returns null when the model is inactive', () => {
            const inactive: LinkModel = { ...model, sampleSize: 1 }
            expect(predict([at(960, 5.0), at(990, 5.3)], inactive, now)).to.equal(null)
        })

        it('returns null on a single reading (cannot confirm a rising trend)', () => {
            expect(predict([at(990, 5.5)], model, now)).to.equal(null)
        })
    })
})

import { expect } from 'chai'
import { describe, it } from 'mocha'
import { River } from '../../src/models/river'
import { detectThresholdCrossings, getActiveThresholds, ThresholdBooleans } from '../../src/utilities/river-sensors'

const makeRiver = (overrides: Partial<River> = {}): River => ({
    id: 1,
    station_id: '3130',
    river_name: 'Reno',
    station_name: 'Casalecchio Chiusa',
    soglia1: 1.5,
    soglia2: 2.2,
    soglia3: 3.0,
    created_on: new Date().toISOString(),
    updated_on: new Date().toISOString(),
    ...overrides,
})

describe('tests/utilities/river-sensors', () => {
    describe('getActiveThresholds', () => {
        it('returns all three thresholds when all are set', () => {
            const thresholds = getActiveThresholds(makeRiver())

            expect(thresholds).to.deep.equal([
                { key: 'soglia1', value: 1.5 },
                { key: 'soglia2', value: 2.2 },
                { key: 'soglia3', value: 3.0 },
            ])
        })

        it('drops null thresholds', () => {
            const thresholds = getActiveThresholds(makeRiver({ soglia2: null }))

            expect(thresholds).to.deep.equal([
                { key: 'soglia1', value: 1.5 },
                { key: 'soglia3', value: 3.0 },
            ])
        })

        it('coerces numeric strings (pg returns NUMERIC as string)', () => {
            const river = makeRiver({
                soglia1: '1.5' as unknown as number,
                soglia2: null,
                soglia3: '3.0' as unknown as number,
            })

            expect(getActiveThresholds(river)).to.deep.equal([
                { key: 'soglia1', value: 1.5 },
                { key: 'soglia3', value: 3.0 },
            ])
        })

        it('returns empty array when no thresholds are set', () => {
            expect(getActiveThresholds(makeRiver({ soglia1: null, soglia2: null, soglia3: null }))).to.deep.equal([])
        })
    })

    describe('detectThresholdCrossings', () => {
        const thresholds = [
            { key: 'soglia1' as const, value: 1.5 },
            { key: 'soglia2' as const, value: 2.2 },
            { key: 'soglia3' as const, value: 3.0 },
        ]

        it('seeds state without emitting crossings on first observation', () => {
            const result = detectThresholdCrossings(2.5, thresholds, undefined)

            expect(result.crossings).to.deep.equal([])
            expect(result.nextState).to.deep.equal({
                soglia1_above: true,
                soglia2_above: true,
                soglia3_above: false,
            })
        })

        it('emits no crossing when the side is unchanged', () => {
            const previous: ThresholdBooleans = {
                soglia1_above: true,
                soglia2_above: false,
                soglia3_above: false,
            }

            const result = detectThresholdCrossings(2.0, thresholds, previous)

            expect(result.crossings).to.deep.equal([])
            expect(result.nextState).to.deep.equal(previous)
        })

        it('emits an above crossing when the level rises past a threshold', () => {
            const previous: ThresholdBooleans = {
                soglia1_above: false,
                soglia2_above: false,
                soglia3_above: false,
            }

            const result = detectThresholdCrossings(1.8, thresholds, previous)

            expect(result.crossings).to.deep.equal([
                { threshold: { key: 'soglia1', value: 1.5 }, direction: 'above' },
            ])
            expect(result.nextState).to.deep.equal({
                soglia1_above: true,
                soglia2_above: false,
                soglia3_above: false,
            })
        })

        it('emits a below crossing when the level drops under a threshold', () => {
            const previous: ThresholdBooleans = {
                soglia1_above: true,
                soglia2_above: false,
                soglia3_above: false,
            }

            const result = detectThresholdCrossings(1.2, thresholds, previous)

            expect(result.crossings).to.deep.equal([
                { threshold: { key: 'soglia1', value: 1.5 }, direction: 'below' },
            ])
        })

        it('emits one crossing per threshold when multiple thresholds flip at once', () => {
            const previous: ThresholdBooleans = {
                soglia1_above: false,
                soglia2_above: false,
                soglia3_above: false,
            }

            const result = detectThresholdCrossings(3.5, thresholds, previous)

            expect(result.crossings).to.deep.equal([
                { threshold: { key: 'soglia1', value: 1.5 }, direction: 'above' },
                { threshold: { key: 'soglia2', value: 2.2 }, direction: 'above' },
                { threshold: { key: 'soglia3', value: 3.0 }, direction: 'above' },
            ])
            expect(result.nextState).to.deep.equal({
                soglia1_above: true,
                soglia2_above: true,
                soglia3_above: true,
            })
        })

        it('treats a null previous boolean as no-prior-reference for that threshold', () => {
            const previous: ThresholdBooleans = {
                soglia1_above: null,
                soglia2_above: false,
                soglia3_above: null,
            }

            const result = detectThresholdCrossings(2.5, thresholds, previous)

            expect(result.crossings).to.deep.equal([
                { threshold: { key: 'soglia2', value: 2.2 }, direction: 'above' },
            ])
            expect(result.nextState).to.deep.equal({
                soglia1_above: true,
                soglia2_above: true,
                soglia3_above: false,
            })
        })

        it('only considers provided active thresholds', () => {
            const previous: ThresholdBooleans = {
                soglia1_above: false,
                soglia2_above: false,
                soglia3_above: false,
            }

            const result = detectThresholdCrossings(2.5, [{ key: 'soglia1', value: 1.5 }], previous)

            expect(result.crossings).to.deep.equal([
                { threshold: { key: 'soglia1', value: 1.5 }, direction: 'above' },
            ])
            expect(result.nextState).to.deep.equal({
                soglia1_above: true,
                soglia2_above: null,
                soglia3_above: null,
            })
        })
    })
})

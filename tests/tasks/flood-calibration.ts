import { expect } from 'chai'
import { afterEach, beforeEach, describe, it } from 'mocha'
import sinon, { SinonStub } from 'sinon'
import * as riverModel from '../../src/models/river'
import * as riverLevelModel from '../../src/models/river-level'
import * as riverLinkModel from '../../src/models/river-link'
import { River } from '../../src/models/river'
import { RiverLink } from '../../src/models/river-link'
import { runFloodCalibration } from '../../src/tasks/flood-calibration'

const T0 = new Date('2026-01-01T00:00:00.000Z').getTime()
const MIN = 60_000
const DAY = 24 * 60 * MIN

const iso = (ms: number) => new Date(ms).toISOString()

const river = (id: number, soglia1: number | null): River => ({
    id,
    station_id: String(id),
    river_name: 'Idice',
    station_name: `st-${id}`,
    soglia1,
    soglia2: null,
    soglia3: null,
    created_on: iso(T0),
    updated_on: iso(T0),
})

const link = (overrides: Partial<RiverLink> = {}): RiverLink => ({
    id: 1,
    upstream_river_id: 10,
    downstream_river_id: 20,
    target_threshold: 1,
    lead_time_minutes: null,
    precursor_level: null,
    sample_size: 0,
    model_json: null,
    last_calibrated_on: null,
    created_on: iso(T0),
    updated_on: iso(T0),
    ...overrides,
})

// Three downstream exceedances (>10) 3 days apart, each preceded by an upstream peak.
const buildPair = (dayOffset: number, leadMin: number, upstreamPeak: number) => {
    const onset = T0 + dayOffset * DAY
    return {
        downstream: [
            { value: 9, measured_at: iso(onset - 30 * MIN) },
            { value: 11, measured_at: iso(onset) },
            { value: 12, measured_at: iso(onset + 30 * MIN) },
            { value: 8, measured_at: iso(onset + 60 * MIN) },
        ],
        upstream: [
            { value: upstreamPeak - 2, measured_at: iso(onset - (leadMin + 60) * MIN) },
            { value: upstreamPeak, measured_at: iso(onset - leadMin * MIN) },
            { value: upstreamPeak - 1, measured_at: iso(onset - (leadMin - 30) * MIN) },
        ],
    }
}

const e = [buildPair(2, 120, 5), buildPair(5, 150, 6), buildPair(8, 135, 5.5)]
const downstreamRows = e.flatMap((p) => p.downstream)
const upstreamRows = e.flatMap((p) => p.upstream)

describe('tests/tasks/flood-calibration', () => {
    let getLinks: SinonStub
    let getRiver: SinonStub
    let getLevels: SinonStub
    let update: SinonStub

    beforeEach(() => {
        getLinks = sinon.stub(riverLinkModel, 'getRiverLinks')
        getRiver = sinon.stub(riverModel, 'getRiverById')
        getLevels = sinon.stub(riverLevelModel, 'getRiverReadingsSince')
        update = sinon.stub(riverLinkModel, 'updateRiverLinkModel').resolves({} as never)
    })

    afterEach(() => sinon.restore())

    it('learns and persists an active model from historical events', async () => {
        getLinks.resolves([link()])
        getRiver.withArgs(20).resolves(river(20, 10))
        getRiver.withArgs(10).resolves(river(10, 5))
        getLevels.withArgs(20).resolves(downstreamRows)
        getLevels.withArgs(10).resolves(upstreamRows)

        const summary = await runFloodCalibration()

        expect(update.calledOnce).to.equal(true)
        const patch = update.firstCall.args[1]
        expect(patch.sample_size).to.equal(3)
        expect(patch.lead_time_minutes).to.equal(135)
        expect(patch.precursor_level).to.be.closeTo(5.25, 1e-9)
        expect(summary).to.deep.equal({ calibrated: 1, active: 1, skipped: 0 })
    })

    it('skips a link whose downstream soglia is not set', async () => {
        getLinks.resolves([link()])
        getRiver.withArgs(20).resolves(river(20, null))
        getRiver.withArgs(10).resolves(river(10, 5))

        const summary = await runFloodCalibration()

        expect(update.called).to.equal(false)
        expect(summary).to.deep.equal({ calibrated: 0, active: 0, skipped: 1 })
    })

    it('skips a link with a missing river', async () => {
        getLinks.resolves([link()])
        getRiver.withArgs(20).resolves(undefined)
        getRiver.withArgs(10).resolves(river(10, 5))

        const summary = await runFloodCalibration()

        expect(summary.skipped).to.equal(1)
        expect(update.called).to.equal(false)
    })

    it('isolates a per-link failure and continues', async () => {
        getLinks.resolves([link({ id: 1 }), link({ id: 2 })])
        getRiver.withArgs(20).resolves(river(20, 10))
        getRiver.withArgs(10).resolves(river(10, 5))
        getLevels.withArgs(20).rejects(new Error('db down'))

        const summary = await runFloodCalibration()

        expect(summary.skipped).to.equal(2)
        expect(summary.calibrated).to.equal(0)
    })

    it('persists an inactive model when there are too few events', async () => {
        getLinks.resolves([link()])
        getRiver.withArgs(20).resolves(river(20, 10))
        getRiver.withArgs(10).resolves(river(10, 5))
        getLevels.withArgs(20).resolves(e[0].downstream) // single event only
        getLevels.withArgs(10).resolves(e[0].upstream)

        const summary = await runFloodCalibration()

        const patch = update.firstCall.args[1]
        expect(patch.sample_size).to.equal(1)
        expect(summary).to.deep.equal({ calibrated: 1, active: 0, skipped: 0 })
    })
})

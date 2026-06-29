import { expect } from 'chai'
import { afterEach, beforeEach, describe, it } from 'mocha'
import sinon, { SinonStub } from 'sinon'
import * as riverModel from '../../src/models/river'
import * as riverLevelModel from '../../src/models/river-level'
import * as riverLinkModel from '../../src/models/river-link'
import * as linkPredictionModel from '../../src/models/link-prediction'
import * as telegram from '../../src/utilities/telegram'
import { River } from '../../src/models/river'
import { RiverLink } from '../../src/models/river-link'
import { runFloodPrediction } from '../../src/tasks/flood-prediction'

const makeLink = (overrides: Partial<RiverLink> = {}): RiverLink => ({
    id: 1,
    upstream_river_id: 10,
    downstream_river_id: 20,
    target_threshold: 1,
    lead_time_minutes: 120,
    precursor_level: 5,
    sample_size: 3,
    model_json: null,
    last_calibrated_on: null,
    created_on: new Date().toISOString(),
    updated_on: new Date().toISOString(),
    ...overrides,
})

const river = (id: number, name: string): River => ({
    id,
    station_id: String(id),
    river_name: name,
    station_name: name,
    soglia1: 10,
    soglia2: 12,
    soglia3: 14,
    created_on: new Date().toISOString(),
    updated_on: new Date().toISOString(),
})

// Two readings, rising, ending at `value`, within the recent window.
const risingTo = (value: number) => [
    { value: value - 0.3, measured_at: new Date(Date.now() - 30 * 60_000).toISOString() },
    { value, measured_at: new Date(Date.now() - 15 * 60_000).toISOString() },
]

describe('tests/tasks/flood-prediction', () => {
    let getLinks: SinonStub
    let getLevels: SinonStub
    let getLatestPred: SinonStub
    let createPred: SinonStub
    let getRiver: SinonStub
    let send: SinonStub

    beforeEach(() => {
        getLinks = sinon.stub(riverLinkModel, 'getRiverLinks')
        getLevels = sinon.stub(riverLevelModel, 'getRiverLevelsSince')
        getLatestPred = sinon.stub(linkPredictionModel, 'getLatestLinkPrediction').resolves(undefined)
        createPred = sinon.stub(linkPredictionModel, 'createLinkPrediction').resolves({} as never)
        getRiver = sinon.stub(riverModel, 'getRiverById')
        send = sinon.stub(telegram, 'sendFloodPredictionMessage').resolves()
        getRiver.withArgs(20).resolves(river(20, 'Idice'))
        getRiver.withArgs(10).resolves(river(10, 'Idice monte'))
    })

    afterEach(() => sinon.restore())

    it('emits and persists a prediction when an active link sees a rising upstream above precursor', async () => {
        getLinks.resolves([makeLink()])
        getLevels.resolves(risingTo(5.4))

        const summary = await runFloodPrediction()

        expect(send.calledOnce).to.equal(true)
        expect(createPred.calledOnce).to.equal(true)
        expect(summary).to.deep.equal({ evaluated: 1, predictions: 1, skipped: 0 })
    })

    it('does not predict when the upstream is below the precursor level', async () => {
        getLinks.resolves([makeLink()])
        getLevels.resolves(risingTo(4.0))

        const summary = await runFloodPrediction()

        expect(send.called).to.equal(false)
        expect(summary.predictions).to.equal(0)
    })

    it('does not predict for an inactive (under-calibrated) link', async () => {
        getLinks.resolves([makeLink({ sample_size: 1 })])
        getLevels.resolves(risingTo(5.4))

        const summary = await runFloodPrediction()

        expect(send.called).to.equal(false)
        expect(summary).to.deep.equal({ evaluated: 1, predictions: 0, skipped: 0 })
    })

    it('suppresses a repeat prediction inside the dedup window', async () => {
        getLinks.resolves([makeLink()])
        getLevels.resolves(risingTo(5.4))
        getLatestPred.resolves({
            id: 9,
            link_id: 1,
            predicted_at: new Date(Date.now() - 10 * 60_000).toISOString(),
            predicted_exceedance_at: new Date().toISOString(),
            upstream_value: 5.4,
            actual_exceedance_at: null,
            outcome: 'pending',
            created_on: new Date().toISOString(),
        })

        const summary = await runFloodPrediction()

        expect(send.called).to.equal(false)
        expect(summary).to.deep.equal({ evaluated: 1, predictions: 0, skipped: 1 })
    })

    it('isolates a per-link failure and keeps evaluating the rest', async () => {
        getLinks.resolves([makeLink({ id: 1, upstream_river_id: 10 }), makeLink({ id: 2, upstream_river_id: 11 })])
        getLevels.withArgs(10).rejects(new Error('db down'))
        getLevels.withArgs(11).resolves(risingTo(4.0))

        const summary = await runFloodPrediction()

        expect(summary.evaluated).to.equal(2)
        expect(summary.skipped).to.equal(1)
    })

    it('does not persist a prediction when the Telegram send fails (so it retries next poll)', async () => {
        getLinks.resolves([makeLink()])
        getLevels.resolves(risingTo(5.4))
        send.rejects(new Error('telegram down'))

        const summary = await runFloodPrediction()

        expect(createPred.called).to.equal(false)
        expect(summary.predictions).to.equal(0)
        expect(summary.skipped).to.equal(1)
    })
})

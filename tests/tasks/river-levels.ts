import { expect } from 'chai'
import { afterEach, beforeEach, describe, it } from 'mocha'
import sinon, { SinonStub } from 'sinon'
import * as riverModel from '../../src/models/river'
import * as riverLevelModel from '../../src/models/river-level'
import * as sensorsService from '../../src/services/river-sensors'
import * as telegram from '../../src/utilities/telegram'
import { River } from '../../src/models/river'
import { RiverLevel } from '../../src/models/river-level'
import { runRiverLevelCheck } from '../../src/tasks/river-levels'

const makeRiver = (overrides: Partial<River> = {}): River => ({
    id: 1,
    station_id: '3130',
    river_name: 'Idice',
    station_name: 'S. Antonio',
    soglia1: 10.5,
    soglia2: 12.2,
    soglia3: 13.7,
    created_on: new Date().toISOString(),
    updated_on: new Date().toISOString(),
    ...overrides,
})

const makeLevel = (overrides: Partial<RiverLevel> = {}): RiverLevel => ({
    id: 1,
    river_id: 1,
    value: 9,
    measured_at: '2026-06-20T00:00:00.000Z',
    soglia1_above: false,
    soglia2_above: false,
    soglia3_above: false,
    created_on: new Date().toISOString(),
    ...overrides,
})

// A timestamp newer than the default makeLevel.measured_at above.
const NEWER_T = new Date('2026-06-21T00:00:00.000Z').getTime()

describe('tests/tasks/river-levels', () => {
    let getRivers: SinonStub
    let getLatest: SinonStub
    let getLatestLevel: SinonStub
    let createIfNew: SinonStub
    let sendMessage: SinonStub

    beforeEach(() => {
        getRivers = sinon.stub(riverModel, 'getRivers')
        getLatest = sinon.stub(sensorsService, 'getLatestRiverSensorValue')
        getLatestLevel = sinon.stub(riverLevelModel, 'getLatestRiverLevel')
        createIfNew = sinon.stub(riverLevelModel, 'createRiverLevelIfNew').resolves(makeLevel())
        sendMessage = sinon.stub(telegram, 'sendRiverLevelCrossingMessage').resolves()
    })

    afterEach(() => {
        sinon.restore()
    })

    it('seeds the first observation without sending a message', async () => {
        getRivers.resolves([makeRiver()])
        getLatestLevel.resolves(undefined)
        getLatest.resolves({ t: NEWER_T, v: 11 })

        const summary = await runRiverLevelCheck()

        expect(createIfNew.calledOnce).to.equal(true)
        expect(sendMessage.called).to.equal(false)
        expect(summary).to.deep.equal({ checked: 1, crossings: 0, skipped: 0, unchanged: 0 })
    })

    it('sends one message when a reading crosses above a threshold', async () => {
        getRivers.resolves([makeRiver()])
        getLatestLevel.resolves(makeLevel({ soglia1_above: false }))
        getLatest.resolves({ t: NEWER_T, v: 11 }) // 11 > soglia1 (10.5) + default margin (0.05)

        const summary = await runRiverLevelCheck()

        expect(sendMessage.calledOnce).to.equal(true)
        const [, crossing] = sendMessage.firstCall.args
        expect(crossing).to.deep.include({ direction: 'above' })
        expect(summary.crossings).to.equal(1)
        expect(summary.checked).to.equal(1)
    })

    it('skips when the latest reading is not newer than the stored one', async () => {
        getRivers.resolves([makeRiver()])
        getLatestLevel.resolves(makeLevel({ measured_at: '2026-06-22T00:00:00.000Z' }))
        getLatest.resolves({ t: new Date('2026-06-21T00:00:00.000Z').getTime(), v: 11 })

        const summary = await runRiverLevelCheck()

        expect(createIfNew.called).to.equal(false)
        expect(sendMessage.called).to.equal(false)
        expect(summary.unchanged).to.equal(1)
    })

    it('counts a sensor fetch failure as skipped and keeps processing other rivers', async () => {
        getRivers.resolves([makeRiver({ id: 1, station_id: 'A' }), makeRiver({ id: 2, station_id: 'B' })])
        getLatestLevel.resolves(undefined)
        getLatest.withArgs('A').rejects(new Error('boom'))
        getLatest.withArgs('B').resolves({ t: NEWER_T, v: 9 })

        const summary = await runRiverLevelCheck()

        expect(summary.skipped).to.equal(1)
        expect(summary.checked).to.equal(1)
    })

    it('does not abort the loop when sending a crossing message fails', async () => {
        getRivers.resolves([makeRiver()])
        getLatestLevel.resolves(makeLevel({ soglia1_above: false }))
        getLatest.resolves({ t: NEWER_T, v: 11 })
        sendMessage.rejects(new Error('telegram down'))

        const summary = await runRiverLevelCheck()

        expect(summary.crossings).to.equal(0)
        expect(summary.checked).to.equal(1)
    })

    it('does not send when the reading was already persisted by a concurrent run', async () => {
        getRivers.resolves([makeRiver()])
        getLatestLevel.resolves(makeLevel({ soglia1_above: false }))
        getLatest.resolves({ t: NEWER_T, v: 11 })
        createIfNew.resolves(undefined)

        const summary = await runRiverLevelCheck()

        expect(sendMessage.called).to.equal(false)
        expect(summary.unchanged).to.equal(1)
        expect(summary.checked).to.equal(0)
    })
})

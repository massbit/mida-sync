import { expect } from 'chai'
import { afterEach, beforeEach, describe, it } from 'mocha'
import sinon, { SinonStub } from 'sinon'
import * as alertService from '../../src/services/meteo-alerts'
import * as alertUtil from '../../src/utilities/meteo-alerts'
import * as alertModel from '../../src/models/alert-report'
import * as telegram from '../../src/utilities/telegram'
import { ParsedMeteoAlert } from '../../src/utilities/meteo-alerts'
import { alertReportKey, runMeteoAlertCheck } from '../../src/tasks/meteo-alerts'

const parsed = (overrides: Partial<ParsedMeteoAlert> = {}): ParsedMeteoAlert =>
    ({
        id: '065/2026',
        isCritic: true,
        dataEmissione: 'Jun 25, 2026 11:45:30 AM',
        titolo: 'Allerta',
        link: 'https://example/allerta065_2026.pdf',
        dataInizio: 'Jun 26, 2026 12:00:00 AM',
        dataFine: 'Jun 27, 2026 12:00:00 AM',
        descrizionemeteo: 'caldo',
        zoneData: {} as ParsedMeteoAlert['zoneData'],
        criticZoneData: {},
        ...overrides,
    }) as ParsedMeteoAlert

describe('tests/tasks/meteo-alerts', () => {
    let getToday: SinonStub
    let getTomorrow: SinonStub
    let parse: SinonStub
    let getByNumber: SinonStub
    let create: SinonStub
    let send: SinonStub

    beforeEach(() => {
        getToday = sinon.stub(alertService, 'getTodayMeteoAlert').resolves({} as never)
        getTomorrow = sinon.stub(alertService, 'getTomorrowMeteoAlert').resolves({} as never)
        parse = sinon.stub(alertUtil, 'parseMeteoAlert')
        getByNumber = sinon.stub(alertModel, 'getAlertReportByNumber').resolves(undefined)
        create = sinon.stub(alertModel, 'createAlertReport').resolves({} as never)
        send = sinon.stub(telegram, 'sendMeteoAlertMessage').resolves()
    })

    afterEach(() => sinon.restore())

    it('sends today AND tomorrow when both are critical, recording each only after its send', async () => {
        parse.returns(parsed({ isCritic: true }))

        await runMeteoAlertCheck()

        // One send + one record per day.
        expect(send.calledTwice).to.equal(true)
        expect(create.calledTwice).to.equal(true)
        expect(send.calledBefore(create)).to.equal(true)
        // Today is passed 'today', tomorrow 'tomorrow'.
        expect(send.getCall(0).args[1]).to.equal('today')
        expect(send.getCall(1).args[1]).to.equal('tomorrow')
    })

    it('keys de-dup on (date, criticality), not the bulletin number', async () => {
        parse.returns(parsed({ isCritic: true, criticZoneData: { temporali: 'yellow' } as never }))

        await runMeteoAlertCheck()

        const keys = getByNumber.getCalls().map((c) => c.args[0])
        expect(keys.length).to.equal(2)
        // today vs tomorrow => different date prefix => distinct keys
        expect(keys[0]).to.not.equal(keys[1])
        // key carries the criticality signature, never the bulletin id
        expect(keys.every((k) => k.endsWith('|temporali=yellow'))).to.equal(true)
        expect(keys.some((k) => k.includes('065/2026'))).to.equal(false)
    })

    it('does not resend a bulletin whose report row already exists', async () => {
        parse.returns(parsed({ isCritic: true }))
        getByNumber.resolves({ id: 1 } as never)

        await runMeteoAlertCheck()

        expect(send.called).to.equal(false)
        expect(create.called).to.equal(false)
    })

    it('records a non-critical bulletin without sending a message', async () => {
        parse.returns(parsed({ isCritic: false }))

        await runMeteoAlertCheck()

        expect(send.called).to.equal(false)
        expect(create.calledTwice).to.equal(true)
    })

    it('does NOT record the report when the send fails, so it retries on the next tick', async () => {
        parse.returns(parsed({ isCritic: true }))
        send.rejects(new Error('telegram down'))

        await runMeteoAlertCheck() // must not throw

        expect(create.called).to.equal(false)
    })

    it('alertReportKey: same date + same colors => same key regardless of bulletin id (re-issue not re-sent)', () => {
        const a = parsed({ id: 'allerta/075/2026', criticZoneData: { temporali: 'yellow' } as never })
        const b = parsed({ id: 'allerta/076/2026', criticZoneData: { temporali: 'yellow' } as never })

        expect(alertReportKey(a, '2026-07-21')).to.equal(alertReportKey(b, '2026-07-21'))
        // escalation (colors change) => different key => re-sends
        const c = parsed({ id: 'allerta/077/2026', criticZoneData: { temporali: 'orange' } as never })
        expect(alertReportKey(a, '2026-07-21')).to.not.equal(alertReportKey(c, '2026-07-21'))
        // same colors, different date => different key
        expect(alertReportKey(a, '2026-07-21')).to.not.equal(alertReportKey(a, '2026-07-22'))
    })

    it('does nothing when neither today nor tomorrow has an alert', async () => {
        getToday.resolves(undefined)
        getTomorrow.resolves(undefined)

        await runMeteoAlertCheck()

        expect(parse.called).to.equal(false)
        expect(send.called).to.equal(false)
        expect(create.called).to.equal(false)
    })
})

import { expect } from 'chai'
import { afterEach, beforeEach, describe, it } from 'mocha'
import sinon, { SinonStub } from 'sinon'
import { http } from '../../src/services/http'
import { getMeteoAlert, getTodayMeteoAlert, getTomorrowMeteoAlert, MeteoAlert } from '../../src/services/meteo-alerts'

const dataParam = (url: string): string => decodeURIComponent(url.split('?data=')[1])

describe('tests/services/meteo-alerts', () => {
    describe('day queries build a Europe/Rome timestamp', () => {
        let axiosGetStub: SinonStub

        beforeEach(() => {
            axiosGetStub = sinon.stub(http, 'get').resolves({ data: {} } as never)
        })

        afterEach(() => axiosGetStub.restore())

        it('queries today with a "YYYY-MM-DD HH:mm" timestamp', async () => {
            await getTodayMeteoAlert()

            const date = dataParam(axiosGetStub.firstCall.args[0])
            expect(date).to.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/)
        })

        it('queries tomorrow one calendar day after today', async () => {
            await getTodayMeteoAlert()
            await getTomorrowMeteoAlert()

            const today = new Date(dataParam(axiosGetStub.firstCall.args[0]).replace(' ', 'T'))
            const tomorrow = new Date(dataParam(axiosGetStub.secondCall.args[0]).replace(' ', 'T'))
            const dayMs = 24 * 60 * 60 * 1000

            // ~1 day apart (allow a minute of clock drift between the two calls).
            expect(tomorrow.getTime() - today.getTime()).to.be.closeTo(dayMs, 60 * 1000)
        })
    })

    describe('getMeteoAlert', () => {
        let axiosGetStub: SinonStub
        const baseUrl =
            'https://allertameteo.regione.emilia-romagna.it/o/get-stato-allerta'

        beforeEach(() => {
            axiosGetStub = sinon.stub(http, 'get')
        })

        afterEach(() => {
            axiosGetStub.restore()
        })

        it('returns undefined when the API response is empty', async () => {
            axiosGetStub.resolves({ data: {} })

            const result = await getMeteoAlert()

            expect(result).to.equal(undefined)
            expect(axiosGetStub.calledOnceWithExactly(baseUrl)).to.equal(true)
        })

        it('returns the response when it contains data', async () => {
            const meteoAlert = { any: 'value' } as unknown as MeteoAlert

            axiosGetStub.resolves({ data: meteoAlert })

            const result = await getMeteoAlert()

            expect(result).to.equal(meteoAlert)
            expect(axiosGetStub.calledOnceWithExactly(baseUrl)).to.equal(true)
        })

        it('appends the date query parameter when provided', async () => {
            const date = '2024-05-10 12:00'
            const meteoAlert = { any: 'value' } as unknown as MeteoAlert

            axiosGetStub.resolves({ data: meteoAlert })

            const result = await getMeteoAlert(date)

            expect(result).to.equal(meteoAlert)
            expect(axiosGetStub.calledOnceWithExactly(`${baseUrl}?data=${date}`)).to.equal(true)
        })
    })
})


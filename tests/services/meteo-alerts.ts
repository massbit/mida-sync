import { expect } from 'chai'
import { afterEach, beforeEach, describe, it } from 'mocha'
import sinon, { SinonStub } from 'sinon'
import axios from 'axios'
import { getMeteoAlert, MeteoAlert } from '../../src/services/meteo-alerts'

describe('tests/services/meteo-alerts', () => {
    describe('getMeteoAlert', () => {
        let axiosGetStub: SinonStub
        const baseUrl =
            'https://allertameteo.regione.emilia-romagna.it/datiTempoReale-prevPiog-portlet/get-stato-allerta'

        beforeEach(() => {
            axiosGetStub = sinon.stub(axios, 'get')
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


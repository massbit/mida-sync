import { expect } from 'chai'
import { afterEach, beforeEach, describe, it } from 'mocha'
import sinon, { SinonStub } from 'sinon'
import { http } from '../../src/services/http'
import { getLatestRiverSensorValue, getRiverSensorTimeSeries } from '../../src/services/river-sensors'

describe('tests/services/river-sensors', () => {
    const expectedUrl =
        'https://allertameteo.regione.emilia-romagna.it/o/api/allerta/get-time-series/?stazione=3130&variabile=254,0,0/1,-,-,-/B13215'

    let axiosGetStub: SinonStub

    beforeEach(() => {
        axiosGetStub = sinon.stub(http, 'get')
    })

    afterEach(() => {
        axiosGetStub.restore()
    })

    describe('getRiverSensorTimeSeries', () => {
        it('builds the correct URL and returns the full array', async () => {
            const series = [
                { t: 1, v: 1.5 },
                { t: 2, v: 1.6 },
            ]

            axiosGetStub.resolves({ data: series })

            const result = await getRiverSensorTimeSeries('3130')

            expect(result).to.deep.equal(series)
            expect(axiosGetStub.calledOnceWithExactly(expectedUrl)).to.equal(true)
        })

        it('returns empty array when response is not an array', async () => {
            axiosGetStub.resolves({ data: null })

            const result = await getRiverSensorTimeSeries('3130')

            expect(result).to.deep.equal([])
        })

        it('filters out malformed points', async () => {
            axiosGetStub.resolves({
                data: [
                    { t: 1, v: 1.5 },
                    { t: 'bad', v: 1.6 },
                    null,
                    { t: 3, v: 'bad' },
                    { t: 4, v: 2.0 },
                ],
            })

            const result = await getRiverSensorTimeSeries('3130')

            expect(result).to.deep.equal([
                { t: 1, v: 1.5 },
                { t: 4, v: 2.0 },
            ])
        })

        it('URL-encodes the station id', async () => {
            axiosGetStub.resolves({ data: [] })

            await getRiverSensorTimeSeries('abc/123')

            expect(
                axiosGetStub.calledOnceWithExactly(
                    'https://allertameteo.regione.emilia-romagna.it/o/api/allerta/get-time-series/?stazione=abc%2F123&variabile=254,0,0/1,-,-,-/B13215'
                )
            ).to.equal(true)
        })

        it('rethrows and logs on HTTP failure', async () => {
            axiosGetStub.rejects(new Error('boom'))

            let caught: unknown

            try {
                await getRiverSensorTimeSeries('3130')
            } catch (err) {
                caught = err
            }

            expect(caught).to.be.instanceOf(Error)
            expect((caught as Error).message).to.equal('boom')
        })
    })

    describe('getLatestRiverSensorValue', () => {
        it('returns undefined when the series is empty', async () => {
            axiosGetStub.resolves({ data: [] })

            const result = await getLatestRiverSensorValue('3130')

            expect(result).to.equal(undefined)
        })

        it('returns the point with the greatest timestamp', async () => {
            axiosGetStub.resolves({
                data: [
                    { t: 10, v: 1.1 },
                    { t: 30, v: 1.3 },
                    { t: 20, v: 1.2 },
                ],
            })

            const result = await getLatestRiverSensorValue('3130')

            expect(result).to.deep.equal({ t: 30, v: 1.3 })
        })
    })
})

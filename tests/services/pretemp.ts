import { expect } from 'chai'
import { afterEach, beforeEach, describe, it } from 'mocha'
import sinon, { SinonFakeTimers, SinonStub } from 'sinon'
import moment from 'moment'
import { http } from '../../src/services/http'
import { getPretempReport, getTomorrowPretempReport } from '../../src/services/pretemp'
import customMoment from '../../src/custom-components/custom-moment'

const IMAGE_URL = 'https://pretemp.it/rails/active_storage/blobs/redirect/abc--def/10-05-2024.jpg'

const archivePage = (ids: number[]) =>
    ids.map((id) => `<a data-turbo-frame="_top" href="/previsioni/${id}">10 maggio 2024</a>`).join('\n')

const forecastPage = (source: string) =>
    `<img class="w-full" alt="Mappa previsione del 10 maggio 2024" src="${source}" />`

const trendPage = () =>
    '<img class="w-full" alt="Mappa tendenza del 10 maggio 2024" src="https://pretemp.it/tendenza_10_05_2024.png" />'

describe('tests/services/pretemp', () => {
    describe('getPretempReport', () => {
        let httpGetStub: SinonStub

        beforeEach(() => {
            httpGetStub = sinon.stub(http, 'get')
        })

        afterEach(() => {
            httpGetStub.restore()
        })

        const date = moment.utc('2024-05-10T00:00:00Z')
        const archiveUrl = 'https://pretemp.it/archivio/2024?date_from=2024-05-10&date_to=2024-05-10'

        it('returns the forecast map, skipping the trend entry of the same day', async () => {
            httpGetStub.withArgs(archiveUrl).resolves({ data: archivePage([3520, 3521]) })
            httpGetStub.withArgs('https://pretemp.it/previsioni/3520').resolves({ data: trendPage() })
            httpGetStub.withArgs('https://pretemp.it/previsioni/3521').resolves({ data: forecastPage(IMAGE_URL) })

            expect(await getPretempReport(date)).to.equal(IMAGE_URL)
        })

        it('makes relative image sources absolute', async () => {
            httpGetStub.withArgs(archiveUrl).resolves({ data: archivePage([3521]) })
            httpGetStub.withArgs('https://pretemp.it/previsioni/3521').resolves({ data: forecastPage('/maps/10-05-2024.jpg') })

            expect(await getPretempReport(date)).to.equal('https://pretemp.it/maps/10-05-2024.jpg')
        })

        it('returns undefined when the day has no forecast', async () => {
            httpGetStub.withArgs(archiveUrl).resolves({ data: archivePage([]) })

            expect(await getPretempReport(date)).to.equal(undefined)
        })

        it('returns undefined when the archive request fails', async () => {
            httpGetStub.withArgs(archiveUrl).rejects(new Error('not found'))

            expect(await getPretempReport(date)).to.equal(undefined)
        })
    })

    describe('getTomorrowPretempReport', () => {
        let httpGetStub: SinonStub
        let clock: SinonFakeTimers

        beforeEach(() => {
            httpGetStub = sinon.stub(http, 'get')
            clock = sinon.useFakeTimers({
                now: Date.UTC(2024, 4, 9, 12, 0, 0),
            })
        })

        afterEach(() => {
            httpGetStub.restore()
            clock.restore()
        })

        it('queries the archive for tomorrow date', async () => {
            const tomorrow = customMoment().add(1, 'day').format('YYYY-MM-DD')

            httpGetStub
                .withArgs(`https://pretemp.it/archivio/2024?date_from=${tomorrow}&date_to=${tomorrow}`)
                .resolves({ data: archivePage([3521]) })
            httpGetStub.withArgs('https://pretemp.it/previsioni/3521').resolves({ data: forecastPage(IMAGE_URL) })

            expect(await getTomorrowPretempReport()).to.equal(IMAGE_URL)
        })
    })
})

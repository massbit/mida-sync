import { expect } from 'chai'
import { afterEach, beforeEach, describe, it } from 'mocha'
import sinon, { SinonFakeTimers, SinonStub } from 'sinon'
import moment from 'moment'
import axios from 'axios'
import { getPretempReport, getTomorrowPretempReport } from '../../src/services/pretemp'
import customMoment from '../../src/custom-components/custom-moment'
import { toFirstLetterUpperCase } from '../../src/utilites/common'

describe('tests/services/pretemp', () => {
    describe('getPretempReport', () => {
        let axiosHeadStub: SinonStub

        beforeEach(() => {
            axiosHeadStub = sinon.stub(axios, 'head')
        })

        afterEach(() => {
            axiosHeadStub.restore()
        })

        const getExpectedUrls = (date: moment.Moment) => {
            const formattedDate = date.format('DD_MM_YYYY')
            const monthLower = date.format('MMMM').toLowerCase()
            const monthCapitalized = toFirstLetterUpperCase(monthLower)

            const base = `https://pretemp.altervista.org/archivio/${date.year()}`

            return [
                `${base}/${monthLower}/cartine/${formattedDate}.png`,
                `${base}/${monthCapitalized}/cartine/${formattedDate}.png`,
            ]
        }

        it('returns undefined when no URL responds', async () => {
            const date = moment.utc('2024-05-10T00:00:00Z')
            const [lowerUrl, upperUrl] = getExpectedUrls(date)

            axiosHeadStub.onFirstCall().rejects(new Error('not found'))
            axiosHeadStub.onSecondCall().rejects(new Error('not found'))

            const result = await getPretempReport(date)

            expect(result).to.equal(undefined)
            expect(axiosHeadStub.calledTwice).to.equal(true)
            expect(axiosHeadStub.firstCall.firstArg).to.equal(lowerUrl)
            expect(axiosHeadStub.secondCall.firstArg).to.equal(upperUrl)
        })

        it('returns the last successful URL when both succeed', async () => {
            const date = moment.utc('2024-05-10T00:00:00Z')
            const [lowerUrl, upperUrl] = getExpectedUrls(date)

            axiosHeadStub.onFirstCall().resolves()
            axiosHeadStub.onSecondCall().resolves()

            const result = await getPretempReport(date)

            expect(result).to.equal(upperUrl)
            expect(axiosHeadStub.calledTwice).to.equal(true)
            expect(axiosHeadStub.firstCall.firstArg).to.equal(lowerUrl)
            expect(axiosHeadStub.secondCall.firstArg).to.equal(upperUrl)
        })

        it('returns the first successful URL when the second fails', async () => {
            const date = moment.utc('2024-05-10T00:00:00Z')
            const [lowerUrl, upperUrl] = getExpectedUrls(date)

            axiosHeadStub.onFirstCall().resolves()
            axiosHeadStub.onSecondCall().rejects(new Error('not found'))

            const result = await getPretempReport(date)

            expect(result).to.equal(lowerUrl)
            expect(axiosHeadStub.calledTwice).to.equal(true)
            expect(axiosHeadStub.firstCall.firstArg).to.equal(lowerUrl)
            expect(axiosHeadStub.secondCall.firstArg).to.equal(upperUrl)
        })
    })

    describe('getTomorrowPretempReport', () => {
        let axiosHeadStub: SinonStub
        let clock: SinonFakeTimers

        beforeEach(() => {
            axiosHeadStub = sinon.stub(axios, 'head')
            clock = sinon.useFakeTimers({
                now: Date.UTC(2024, 4, 9, 12, 0, 0),
            })
        })

        afterEach(() => {
            axiosHeadStub.restore()
            clock.restore()
        })

        it('uses tomorrow date and returns the first available URL', async () => {
            const tomorrow = customMoment().add(1, 'day')
            const formattedDate = tomorrow.format('DD_MM_YYYY')
            const monthLower = tomorrow.format('MMMM').toLowerCase()
            const monthCapitalized = toFirstLetterUpperCase(monthLower)
            const base = `https://pretemp.altervista.org/archivio/${tomorrow.year()}`
            const lowerUrl = `${base}/${monthLower}/cartine/${formattedDate}.png`
            const upperUrl = `${base}/${monthCapitalized}/cartine/${formattedDate}.png`

            axiosHeadStub.onFirstCall().rejects(new Error('not found'))
            axiosHeadStub.onSecondCall().resolves()

            const result = await getTomorrowPretempReport()

            expect(result).to.equal(upperUrl)
            expect(axiosHeadStub.calledTwice).to.equal(true)
            expect(axiosHeadStub.firstCall.firstArg).to.equal(lowerUrl)
            expect(axiosHeadStub.secondCall.firstArg).to.equal(upperUrl)
        })
    })
})


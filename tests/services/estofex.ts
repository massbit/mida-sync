import { expect } from 'chai'
import { afterEach, beforeEach, describe, it } from 'mocha'
import sinon, { SinonStub } from 'sinon'
import axios from 'axios'
import { XMLParser } from 'fast-xml-parser'
import { getEstofexImage, getEstofexReport } from '../../src/services/estofex'

describe('tests/services/estofex', () => {
    describe('getEstofexReport', () => {
        let axiosGetStub: SinonStub
        let parserStub: SinonStub

        beforeEach(() => {
            axiosGetStub = sinon.stub(axios, 'get')
            parserStub = sinon.stub(XMLParser.prototype, 'parse')
        })

        afterEach(() => {
            axiosGetStub.restore()
            parserStub.restore()
        })

        it('fetches the XML and returns the parsed report', async () => {
            const xmlPayload = '<root><forecast></forecast></root>'
            const parsedReport = { forecast: {} }

            axiosGetStub.resolves({ data: xmlPayload })
            parserStub.returns(parsedReport)

            const result = await getEstofexReport()

            expect(result).to.equal(parsedReport)
            expect(axiosGetStub.calledOnceWithExactly('https://www.estofex.org/cgi-bin/polygon/showforecast.cgi?xml=yes')).to.equal(true)
            expect(parserStub.calledOnceWithExactly(xmlPayload)).to.equal(true)
        })
    })

    describe('getEstofexImage', () => {
        let axiosHeadStub: SinonStub

        beforeEach(() => {
            axiosHeadStub = sinon.stub(axios, 'head')
        })

        afterEach(() => {
            axiosHeadStub.restore()
        })

        it('returns the image url when HEAD succeeds', async () => {
            axiosHeadStub.resolves()

            const result = await getEstofexImage()

            expect(result).to.equal('https://www.estofex.org/forecasts/tempmap/.png')
            expect(axiosHeadStub.calledOnceWithExactly('https://www.estofex.org/forecasts/tempmap/.png')).to.equal(true)
        })

        it('throws when the image is not available', async () => {
            axiosHeadStub.rejects(new Error('unavailable'))

            try {
                await getEstofexImage()
                expect.fail('Expected getEstofexImage to throw')
            } catch (error) {
                expect((error as Error).message).to.equal('Estofex image not available')
            }

            expect(axiosHeadStub.calledOnceWithExactly('https://www.estofex.org/forecasts/tempmap/.png')).to.equal(true)
        })
    })
})


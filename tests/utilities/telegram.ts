import { expect } from 'chai'
import { afterEach, beforeEach, describe, it } from 'mocha'
import sinon, { SinonStub } from 'sinon'
import * as telegramService from '../../src/services/telegram'
import { sendRiverLevelCrossingMessage } from '../../src/utilities/telegram'
import { River } from '../../src/models/river'
import { ThresholdCrossing } from '../../src/utilities/river-sensors'

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

describe('tests/utilities/telegram', () => {
    let sendStub: SinonStub

    beforeEach(() => {
        sendStub = sinon.stub(telegramService, 'sendTelegramMessage').resolves()
    })

    afterEach(() => {
        sendStub.restore()
    })

    describe('sendRiverLevelCrossingMessage', () => {
        it('sends an "above" message and passes no parse_mode (HTML-unsafe names stay literal)', async () => {
            const crossing: ThresholdCrossing = {
                threshold: { key: 'soglia2', value: 12.2 },
                direction: 'above',
            }

            await sendRiverLevelCrossingMessage(makeRiver({ river_name: 'Reno & Idice' }), crossing, 12.5)

            expect(sendStub.calledOnce).to.equal(true)
            const [, text, extra] = sendStub.firstCall.args
            expect(extra).to.equal(undefined)
            expect(text).to.contain('Reno & Idice')
            expect(text).to.contain('Superata soglia 2')
            expect(text).to.contain('Livello attuale: 12.5 m')
            expect(text).to.contain('Soglia: 12.2 m')
        })

        it('sends a "below" message when the level falls back under a threshold', async () => {
            const crossing: ThresholdCrossing = {
                threshold: { key: 'soglia1', value: 10.5 },
                direction: 'below',
            }

            await sendRiverLevelCrossingMessage(makeRiver(), crossing, 10.1)

            const [, text] = sendStub.firstCall.args
            expect(text).to.contain('Rientrata sotto soglia 1')
        })
    })
})

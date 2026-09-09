import { expect } from 'chai'
import { afterEach, before, beforeEach, describe, it } from 'mocha'
import sinon, { SinonStub } from 'sinon'
import i18next from 'i18next'
import * as telegramService from '../../src/services/telegram'
import { sendMeteoAlertMessage, sendRiverLevelCrossingMessage } from '../../src/utilities/telegram'
import { ParsedMeteoAlert } from '../../src/utilities/meteo-alerts'
import italian from '../../src/resources/locales/it.json'
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

const makeAlert = (criticZoneData: Record<string, string>): ParsedMeteoAlert =>
    ({
        id: '065/2026',
        isCritic: true,
        dataEmissione: 'Jun 25, 2026 11:45:30 AM',
        titolo: 'Allerta',
        link: 'https://example/allerta065_2026.pdf',
        dataInizio: 'Jun 26, 2026 12:00:00 AM',
        dataFine: 'Jun 27, 2026 12:00:00 AM',
        descrizionemeteo: 'temporali forti',
        zoneData: {} as ParsedMeteoAlert['zoneData'],
        criticZoneData,
    }) as unknown as ParsedMeteoAlert

describe('tests/utilities/telegram', () => {
    let sendStub: SinonStub

    // translateKey reads i18next, which only the server bootstraps; without this the colour names
    // would come back as raw keys.
    before(async () => {
        await i18next.init({ resources: { it: { translation: italian } }, lng: 'it', fallbackLng: 'it' })
    })

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

    describe('sendMeteoAlertMessage', () => {
        const textOf = () => sendStub.firstCall.args[1] as string

        it('renders the colour transition when a phenomenon escalates', async () => {
            await sendMeteoAlertMessage(makeAlert({ temporali: 'orange' }), 'today', { temporali: 'yellow' })

            expect(textOf()).to.contain('TEMPORALI: 🟡 Gialla → 🟠 Arancione')
        })

        it('renders the transition the other way round when it de-escalates', async () => {
            await sendMeteoAlertMessage(makeAlert({ temporali: 'yellow' }), 'today', { temporali: 'orange' })

            expect(textOf()).to.contain('TEMPORALI: 🟠 Arancione → 🟡 Gialla')
        })

        it('keeps the plain line for phenomena whose colour did not move', async () => {
            await sendMeteoAlertMessage(makeAlert({ temporali: 'orange', vento: 'red' }), 'today', {
                temporali: 'orange',
                vento: 'orange',
            })

            const text = textOf()
            expect(text).to.contain('TEMPORALI: 🟠 Arancione\n')
            expect(text).to.not.contain('TEMPORALI: 🟠 Arancione →')
            expect(text).to.contain('VENTO: 🟠 Arancione → 🔴 Rossa')
        })

        it('still reports a phenomenon that dropped back to green', async () => {
            await sendMeteoAlertMessage(makeAlert({ temporali: 'yellow' }), 'today', {
                temporali: 'yellow',
                vento: 'orange',
            })

            expect(textOf()).to.contain('VENTO: 🟠 Arancione → 🟢 Verde')
        })

        it('renders the message unchanged when there is no previous state', async () => {
            await sendMeteoAlertMessage(makeAlert({ temporali: 'orange' }), 'tomorrow')

            const text = textOf()
            expect(text).to.contain('TEMPORALI: 🟠 Arancione')
            expect(text).to.not.contain('→')
        })
    })
})

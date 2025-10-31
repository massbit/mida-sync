import { expect } from 'chai'
import { describe, it } from 'mocha'
import { parseMeteoAlert } from '../../src/utilites/meteo-alerts'
import { alertZones, MeteoAlertType } from '../../src/services/meteo-alerts'

describe('parseMeteoAlert', () => {
    it('throws if the requested zone is not present in the alert', () => {
        const zone = 'non_existent_zone'
        const alert: any = {
            link: '/alerts/allerta_123_45.pdf',
            title: 'Test alert',
            // no zone property
        }

        expect(() => parseMeteoAlert(alert, zone as any)).to.throw(`Zone ${zone} not found in alert data`)
    })

    it('throws if alert.link does not contain a filename', () => {
        const zone = alertZones[0]
        const alert: any = {
            link: '/path/with/trailing/slash/',
            title: 'Test alert',
            [zone]: {
                ghiaccio_pioggia_gela: null,
            },
        }

        expect(() => parseMeteoAlert(alert, zone)).to.throw(`Invalid link format: ${alert.link}`)
    })

    it('parses id, updates link, computes isCritic and criticZoneData and omits zone keys from root', () => {
        const zone = alertZones[0]
        // Construct zone data using the known keys from the utility's correctColors mapping.
        const zoneData = {
            ghiaccio_pioggia_gela: null, // allowed / removed from criticZoneData
            idraulica: MeteoAlertType.yellow, // allowed by correctColors but is not in colorsToRemove -> should appear in criticZoneData
            idrogeologica: null,
            mareggiate: null,
            neve: MeteoAlertType.yellow, // NOT allowed by correctColors.neve -> makes isCritic true and included in criticZoneData
            stato_mare: null,
            temperature_estreme: MeteoAlertType.green,
            temporali: MeteoAlertType.green,
            vento: MeteoAlertType.red, // NOT allowed -> included in criticZoneData
        } as any

        const originalLink = '/alerts/allerta_123_45.pdf'
        const alert: any = {
            link: originalLink,
            title: 'Sample alert title',
            otherProp: 42,
            [zone]: zoneData,
        }

        const parsed = parseMeteoAlert(alert, zone)

        // id: 'allerta_123_45' -> remove .pdf -> 'allerta_123_45' -> replace first '_' -> 'allerta/123_45' -> remove 'allerta' -> '/123_45'
        expect(parsed.id).to.equal('/123_45')

        // link must be prefixed with the base URL
        expect(parsed.link).to.equal(`https://allertameteo.regione.emilia-romagna.it${originalLink}`)

        // zoneData should be preserved on the returned object
        expect(parsed.zoneData).to.deep.equal(zoneData)

        // isCritic should be true because 'neve' and 'vento' use types not allowed by correctColors
        expect(parsed.isCritic).to.equal(true)

        // criticZoneData should include only keys whose value is not in colorsToRemove ([null, green])
        // From our zoneData that means idraulica (yellow), neve (yellow), vento (red)
        expect(parsed.criticZoneData).to.deep.equal({
            idraulica: MeteoAlertType.yellow,
            neve: MeteoAlertType.yellow,
            vento: MeteoAlertType.red,
        })

        // The top-level returned object should have omitted the original zone key (it is provided separately as zoneData)
        expect((parsed as any)[zone]).to.equal(undefined)
    })
})

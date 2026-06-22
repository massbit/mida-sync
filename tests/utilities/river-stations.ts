import { expect } from 'chai'
import { describe, it } from 'mocha'
import { RawSensorStation } from '../../src/services/river-sensors'
import { findNearestStations, haversineKm, parseSensorStations } from '../../src/utilities/river-stations'

const rawStation = (overrides: Partial<RawSensorStation> = {}): RawSensorStation => ({
    idstazione: '3130',
    nomestaz: 'S. Antonio',
    lat: '4457480',
    lon: '1170609',
    value: null,
    soglia1: 10.5,
    soglia2: 12.2,
    soglia3: 13.7,
    ...overrides,
})

describe('tests/utilities/river-stations', () => {
    describe('parseSensorStations', () => {
        it('scales the integer-string coordinates by 1e5', () => {
            const [station] = parseSensorStations([rawStation()])

            expect(station.lat).to.be.closeTo(44.5748, 1e-9)
            expect(station.lon).to.be.closeTo(11.70609, 1e-9)
            expect(station.stationId).to.equal('3130')
            expect(station.name).to.equal('S. Antonio')
        })

        it('normalises a 0 soglia to null (no official threshold)', () => {
            const [station] = parseSensorStations([rawStation({ soglia1: 0, soglia2: 8.5, soglia3: 0 })])

            expect(station.soglia1).to.equal(null)
            expect(station.soglia2).to.equal(8.5)
            expect(station.soglia3).to.equal(null)
        })

        it('drops entries with unparseable coordinates', () => {
            const result = parseSensorStations([rawStation({ lat: 'n/a' }), rawStation({ idstazione: '3149' })])

            expect(result).to.have.length(1)
            expect(result[0].stationId).to.equal('3149')
        })
    })

    describe('haversineKm', () => {
        it('returns 0 for the same point', () => {
            expect(haversineKm({ lat: 44.6, lon: 11.6 }, { lat: 44.6, lon: 11.6 })).to.equal(0)
        })

        it('returns ~111 km for one degree of latitude', () => {
            expect(haversineKm({ lat: 0, lon: 0 }, { lat: 1, lon: 0 })).to.be.closeTo(111.19, 0.5)
        })

        it('matches the known S. Antonio -> Molinella distance', () => {
            expect(haversineKm({ lat: 44.5748, lon: 11.70609 }, { lat: 44.617, lon: 11.667 })).to.be.closeTo(5.6, 0.5)
        })
    })

    describe('findNearestStations', () => {
        const stations = parseSensorStations([
            rawStation({ idstazione: 'far', lat: '4482117', lon: '1099474' }),
            rawStation({ idstazione: 'near', lat: '4457480', lon: '1170609' }),
            rawStation({ idstazione: 'mid', lat: '4467307', lon: '1162513' }),
        ])
        const molinella = { lat: 44.617, lon: 11.667 }

        it('sorts by ascending distance and attaches distanceKm', () => {
            const result = findNearestStations(stations, molinella)

            expect(result.map((s) => s.stationId)).to.deep.equal(['near', 'mid', 'far'])
            expect(result[0].distanceKm).to.be.lessThan(result[1].distanceKm)
        })

        it('respects the limit', () => {
            expect(findNearestStations(stations, molinella, 1).map((s) => s.stationId)).to.deep.equal(['near'])
        })
    })
})

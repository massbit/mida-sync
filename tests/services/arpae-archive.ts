import { expect } from 'chai'
import { describe, it } from 'mocha'
import { ArchiveTarget, archiveUrlForMonth, coordKey, parseArchiveLine } from '../../src/services/arpae-archive'

const S_ANTONIO_LAT = 4457480
const S_ANTONIO_LON = 1170609

const index = new Map<string, ArchiveTarget>([
    [coordKey(S_ANTONIO_LAT, S_ANTONIO_LON), { riverId: 1, soglia1: 10.5, soglia2: 12.2, soglia3: 13.7 }],
])

// Mirrors the verified archive shape: a metadata block then measurement blocks; the hydrometric
// level is the timerange[0] === 254 block carrying B13215.
const buildLine = (overrides: Record<string, unknown> = {}): string =>
    JSON.stringify({
        network: 'simnbo',
        ident: null,
        lat: S_ANTONIO_LAT,
        lon: S_ANTONIO_LON,
        date: '2023-05-03T12:00:00Z',
        data: [
            { vars: { B01019: { v: 'S. Antonio' } } },
            { timerange: [1, 0, 900], level: [1, null, null, null], vars: { B13215: { v: 99 } } },
            { timerange: [254, 0, 0], level: [1, null, null, null], vars: { B13215: { v: 14.39 } } },
        ],
        ...overrides,
    })

describe('tests/services/arpae-archive', () => {
    describe('archiveUrlForMonth', () => {
        it('zero-pads the month', () => {
            expect(archiveUrlForMonth(2023, 5)).to.equal(
                'https://dati-simc.arpae.it/opendata/osservati/meteo/storico/2023-05.json.gz'
            )
        })
    })

    describe('parseArchiveLine', () => {
        it('extracts the 254/B13215 reading and computes soglia flags', () => {
            const reading = parseArchiveLine(buildLine(), index)

            expect(reading).to.deep.equal({
                river_id: 1,
                value: 14.39,
                measured_at: '2023-05-03T12:00:00.000Z',
                soglia1_above: true,
                soglia2_above: true,
                soglia3_above: true,
            })
        })

        it('ignores non-hydrometric timeranges and uses the 254 block', () => {
            // The [1,0,900] block (value 99) must not be picked.
            const reading = parseArchiveLine(buildLine(), index)
            expect(reading?.value).to.equal(14.39)
        })

        it('returns null for a station not in the index', () => {
            expect(parseArchiveLine(buildLine({ lat: 1, lon: 2 }), index)).to.equal(null)
        })

        it('returns null when there is no hydrometric block', () => {
            const line = buildLine({ data: [{ vars: { B01019: { v: 'S. Antonio' } } }] })
            expect(parseArchiveLine(line, index)).to.equal(null)
        })

        it('returns null when the level value is null', () => {
            const line = buildLine({
                data: [{ timerange: [254, 0, 0], level: [1, null, null, null], vars: { B13215: { v: null } } }],
            })
            expect(parseArchiveLine(line, index)).to.equal(null)
        })

        it('returns null on malformed JSON', () => {
            expect(parseArchiveLine('{not json', index)).to.equal(null)
        })

        it('leaves a soglia flag null when that threshold is unset', () => {
            const sparseIndex = new Map<string, ArchiveTarget>([
                [coordKey(S_ANTONIO_LAT, S_ANTONIO_LON), { riverId: 2, soglia1: 10.5, soglia2: null, soglia3: null }],
            ])
            const reading = parseArchiveLine(buildLine(), sparseIndex)

            expect(reading?.soglia1_above).to.equal(true)
            expect(reading?.soglia2_above).to.equal(null)
            expect(reading?.soglia3_above).to.equal(null)
        })
    })
})

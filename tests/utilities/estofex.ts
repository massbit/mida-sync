import { expect } from 'chai'
import { afterEach, beforeEach, describe, it } from 'mocha'
import sinon, { SinonFakeTimers } from 'sinon'
import { checkEstofexReport } from '../../src/utilities/estofex'
import { EstofexReport } from '../../src/services/estofex'

describe('tests/utilities/estofex.ts', () => {
    describe('checkEstofexReport', () => {
        let clock: SinonFakeTimers

        // Estofex emits start/expiry as a UTC 'YYYYMMDDHH' string. "Now" is 10 May 2024 00:00 UTC.
        const baseTimestamp = Date.UTC(2024, 4, 10, 0, 0, 0)

        beforeEach(() => {
            clock = sinon.useFakeTimers(baseTimestamp)
        })

        afterEach(() => {
            clock.restore()
        })

        it('returns false when forecast is missing', () => {
            const report: EstofexReport = {}

            expect(checkEstofexReport(report)).to.equal(false)
        })

        it('returns false when start_time or expiry_time is missing', () => {
            const withoutStart: EstofexReport = {
                forecast: {
                    expiry_time: {
                        '@_value': '2024051100',
                    },
                },
            }

            const withoutExpiry: EstofexReport = {
                forecast: {
                    start_time: {
                        '@_value': '2024051000',
                    },
                },
            }

            expect(checkEstofexReport(withoutStart)).to.equal(false)
            expect(checkEstofexReport(withoutExpiry)).to.equal(false)
        })

        it("returns false when '@_value' is missing in timestamps", () => {
            const report: EstofexReport = {
                forecast: {
                    start_time: {},
                    expiry_time: {
                        '@_value': '2024051100',
                    },
                },
            }

            expect(checkEstofexReport(report)).to.equal(false)
        })

        it('returns true when the report covers the current day plus one', () => {
            // start 10 May 12:00, expiry 11 May 12:00 UTC — straddles "tomorrow" (11 May 00:00).
            const report: EstofexReport = {
                forecast: {
                    start_time: {
                        '@_value': '2024051012',
                    },
                    expiry_time: {
                        '@_value': '2024051112',
                    },
                },
            }

            expect(checkEstofexReport(report)).to.equal(true)
        })

        it('returns false when the report starts after tomorrow', () => {
            // start 11 May 12:00 — after tomorrow (11 May 00:00).
            const report: EstofexReport = {
                forecast: {
                    start_time: {
                        '@_value': '2024051112',
                    },
                    expiry_time: {
                        '@_value': '2024051300',
                    },
                },
            }

            expect(checkEstofexReport(report)).to.equal(false)
        })

        it('returns false when the report ends before tomorrow', () => {
            // expiry 10 May 12:00 — before tomorrow (11 May 00:00).
            const report: EstofexReport = {
                forecast: {
                    start_time: {
                        '@_value': '2024051000',
                    },
                    expiry_time: {
                        '@_value': '2024051012',
                    },
                },
            }

            expect(checkEstofexReport(report)).to.equal(false)
        })
    })
})

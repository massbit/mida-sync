import { expect } from 'chai'
import { afterEach, beforeEach, describe, it } from 'mocha'
import sinon, { SinonFakeTimers } from 'sinon'
import { checkEstofexReport } from '../../src/utilites/estofex'
import { EstofexReport } from '../../src/services/estofex'

describe('tests/utilities/estofex.ts', () => {
    describe('checkEstofexReport', () => {
        let clock: SinonFakeTimers

        const baseTimestamp = Date.UTC(2024, 4, 10, 0, 0, 0) // 10 maggio 2024 00:00:00 UTC
        const oneDayMs = 24 * 60 * 60 * 1000
        const twelveHoursMs = 12 * 60 * 60 * 1000

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
                        '@_value': String(baseTimestamp + oneDayMs),
                    },
                },
            }

            const withoutExpiry: EstofexReport = {
                forecast: {
                    start_time: {
                        '@_value': String(baseTimestamp),
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
                        '@_value': String(baseTimestamp + oneDayMs),
                    },
                },
            }

            expect(checkEstofexReport(report)).to.equal(false)
        })

        it('returns true when the report covers the current day plus one', () => {
            const report: EstofexReport = {
                forecast: {
                    start_time: {
                        '@_value': String(baseTimestamp + twelveHoursMs),
                    },
                    expiry_time: {
                        '@_value': String(baseTimestamp + oneDayMs + twelveHoursMs),
                    },
                },
            }

            expect(checkEstofexReport(report)).to.equal(true)
        })

        it('returns false when the report starts after tomorrow', () => {
            const report: EstofexReport = {
                forecast: {
                    start_time: {
                        '@_value': String(baseTimestamp + oneDayMs + twelveHoursMs),
                    },
                    expiry_time: {
                        '@_value': String(baseTimestamp + 3 * oneDayMs),
                    },
                },
            }

            expect(checkEstofexReport(report)).to.equal(false)
        })

        it('returns false when the report ends before tomorrow', () => {
            const report: EstofexReport = {
                forecast: {
                    start_time: {
                        '@_value': String(baseTimestamp),
                    },
                    expiry_time: {
                        '@_value': String(baseTimestamp + twelveHoursMs),
                    },
                },
            }

            expect(checkEstofexReport(report)).to.equal(false)
        })
    })
})

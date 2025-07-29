import { expect } from 'chai'
import { getActualWorkShift } from '../../src/utilites/common'
import sinon from 'sinon'

describe('tests/utilities/common.ts', () => {
    let clock: sinon.SinonFakeTimers

    afterEach(() => {
        if (clock) {
            clock.restore()
        }
    })

    describe('getActualWorkShift', () => {
        it('should return shift "A" with night shift for volunteers at 05:00', () => {
            // Mock now date to be 29 july 2025 at 05:00
            clock = sinon.useFakeTimers(new Date('2025-07-29T05:00:00').getTime())

            const result = getActualWorkShift(true)

            expect(result.shift).to.equal('A')
            expect(result.night).to.be.true
        })

        it('should return shift "D" with night shift for permanents at 05:00', () => {
            // Mock now date to be 29 july 2025 at 05:00
            clock = sinon.useFakeTimers(new Date('2025-07-29T05:00:00').getTime())

            const result = getActualWorkShift(false)

            expect(result.shift).to.equal('D')
            expect(result.night).to.be.true
        })

        it('should return shift "B" with day shift for volunteers at 08:30', () => {
            // Mock now date to be 29 july 2025 at 08:30
            clock = sinon.useFakeTimers(new Date('2025-07-29T08:30:00').getTime())

            const result = getActualWorkShift(true)

            expect(result.shift).to.equal('B')
            expect(result.night).to.be.false
        })

        it('should return shift "B" with day shift for permanents at 08:30', () => {
            // Mock now date to be 29 july 2025 at 08:30
            clock = sinon.useFakeTimers(new Date('2025-07-29T08:30:00').getTime())

            const result = getActualWorkShift(false)

            expect(result.shift).to.equal('B')
            expect(result.night).to.be.false
        })

        it('should return shift "B" with night shift for volunteers at 20:30', () => {
            // Mock now date to be 29 july 2025 at 20:30
            clock = sinon.useFakeTimers(new Date('2025-07-29T20:30:00').getTime())

            const result = getActualWorkShift(true)

            expect(result.shift).to.equal('B')
            expect(result.night).to.be.true
        })

        it('should return shift "A" with night shift for permanents at 20:30', () => {
            // Mock now date to be 29 july 2025 at 20:30
            clock = sinon.useFakeTimers(new Date('2025-07-29T20:30:00').getTime())

            const result = getActualWorkShift(false)

            expect(result.shift).to.equal('A')
            expect(result.night).to.be.true
        })

        it('should return shift "D" with night shift for permanents at 07:30', () => {
            // Mock now date to be 29 july 2025 at 07:30
            clock = sinon.useFakeTimers(new Date('2025-07-29T07:30:00').getTime())

            const result = getActualWorkShift(false)

            expect(result.shift).to.equal('D')
            expect(result.night).to.be.true
        })

        it('should return shift "B" with day shift for volunteers at 07:30', () => {
            // Mock now date to be 29 july 2025 at 07:30
            clock = sinon.useFakeTimers(new Date('2025-07-29T07:30:00').getTime())

            const result = getActualWorkShift(true)

            expect(result.shift).to.equal('B')
            expect(result.night).to.be.false
        })

        it('should return the correct shifts with at 07:00', () => {
            // Mock now date to be 29 july 2025 at 07:00
            clock = sinon.useFakeTimers(new Date('2025-07-29T07:00:00').getTime())

            const permanentShift = getActualWorkShift(false)
            const volunteerShift = getActualWorkShift(true)

            expect(permanentShift.shift).to.equal('D')
            expect(permanentShift.night).to.be.true

            expect(volunteerShift.shift).to.equal('B')
            expect(volunteerShift.night).to.be.false
        })

        it('should return the correct shifts with at 20:00', () => {
            // Mock now date to be 29 july 2025 at 20:00
            clock = sinon.useFakeTimers(new Date('2025-07-29T20:00:00').getTime())

            const permanentShift = getActualWorkShift(false)
            const volunteerShift = getActualWorkShift(true)

            expect(permanentShift.shift).to.equal('A')
            expect(permanentShift.night).to.be.true

            expect(volunteerShift.shift).to.equal('B')
            expect(volunteerShift.night).to.be.true
        })
    })
})

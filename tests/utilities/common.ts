import { expect } from 'chai'
import { getActualWorkShift } from '../../src/utilites/common'

describe('tests/utilities/common.ts', () => {
    it('should return the current work shift', () => {
        const shift = getActualWorkShift(false)

        expect(shift).to.have.property('shift')
        expect(shift).to.have.property('night')
        expect(['A', 'B', 'C', 'D']).to.include(shift.shift)
        expect(shift.night).to.be.a('boolean')
    })
    it('should return the correct shift based on the current date', () => {
        const startDate = new Date('2019-01-01T00:00:00Z')
        const nowDate = new Date()

        // Calculate the expected shift index
        const dayDiff = Math.floor((nowDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
        const shiftChanged = nowDate.getHours() >= 8
        const nightShift = nowDate.getHours() >= 20
        const shiftIndex = (dayDiff % 4) - (shiftChanged ? 0 : 1) - (nightShift ? 1 : 0)

        const expectedShift = ['A', 'B', 'C', 'D'][shiftIndex < 0 ? shiftIndex + 4 : shiftIndex]

        const actualShift = getActualWorkShift(false)

        expect(actualShift.shift).to.equal(expectedShift)
    })
})

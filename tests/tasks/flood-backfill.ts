import { expect } from 'chai'
import { describe, it } from 'mocha'
import { expandMonthRange } from '../../src/tasks/flood-backfill'

describe('tests/tasks/flood-backfill', () => {
    describe('expandMonthRange', () => {
        it('expands a single month', () => {
            expect(expandMonthRange('2023-05', '2023-05')).to.deep.equal([{ year: 2023, month: 5 }])
        })

        it('expands across a year boundary inclusively', () => {
            expect(expandMonthRange('2023-11', '2024-02')).to.deep.equal([
                { year: 2023, month: 11 },
                { year: 2023, month: 12 },
                { year: 2024, month: 1 },
                { year: 2024, month: 2 },
            ])
        })

        it('throws on an invalid month', () => {
            expect(() => expandMonthRange('2023-13', '2024-01')).to.throw()
        })
    })
})

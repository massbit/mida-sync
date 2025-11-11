import { expect } from 'chai'
import { toFirstLetterUpperCase } from '../../src/utilites/common'

describe('tests/utilities/common.ts', () => {
    describe('toFirstLetterUpperCase', () => {
        it('capitalizes the first letter of a lowercase word', () => {
            expect(toFirstLetterUpperCase('hello')).to.equal('Hello')
        })

        it('returns the same string if first letter is already uppercase', () => {
            expect(toFirstLetterUpperCase('Hello')).to.equal('Hello')
        })

        it('returns empty string unchanged', () => {
            expect(toFirstLetterUpperCase('')).to.equal('')
        })

        it('capitalizes a single-letter string', () => {
            expect(toFirstLetterUpperCase('a')).to.equal('A')
        })

        it('does not change strings that start with a non-letter character', () => {
            expect(toFirstLetterUpperCase('1abc')).to.equal('1abc')
            expect(toFirstLetterUpperCase('!bang')).to.equal('!bang')
        })

        it('capitalizes unicode first letters', () => {
            expect(toFirstLetterUpperCase('éclair')).to.equal('Éclair')
        })

        it('only changes the first character and leaves the rest intact', () => {
            expect(toFirstLetterUpperCase('hELLO')).to.equal('HELLO')
            expect(toFirstLetterUpperCase('hello world')).to.equal('Hello world')
        })
    })
})

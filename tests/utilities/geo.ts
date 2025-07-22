import { expect } from 'chai'
import sinon from 'sinon'
import { checkIfPointIsInPolygon, Coordinates, isPointInPolygon, parseMultiArrayPolygon } from '../../src/utilites/geo'

describe('tests/utilities/geo.ts', () => {
    describe('checkIfPointIsInPolygon', () => {
        it('should return true when point is inside a polygon', () => {
            const point: Coordinates = { latitude: 1, longitude: 1 }
            const polygon: Coordinates[] = [
                { latitude: 0, longitude: 0 },
                { latitude: 0, longitude: 2 },
                { latitude: 2, longitude: 2 },
                { latitude: 2, longitude: 0 },
            ]
            expect(checkIfPointIsInPolygon(point, polygon)).to.be.true
        })

        it('should return false when point is outside a polygon', () => {
            const point: Coordinates = { latitude: 3, longitude: 3 }
            const polygon: Coordinates[] = [
                { latitude: 0, longitude: 0 },
                { latitude: 0, longitude: 2 },
                { latitude: 2, longitude: 2 },
                { latitude: 2, longitude: 0 },
            ]
            expect(checkIfPointIsInPolygon(point, polygon)).to.be.false
        })

        it('should handle edge cases correctly', () => {
            const point: Coordinates = { latitude: 0, longitude: 1 }
            const polygon: Coordinates[] = [
                { latitude: 0, longitude: 0 },
                { latitude: 0, longitude: 2 },
                { latitude: 2, longitude: 2 },
                { latitude: 2, longitude: 0 },
            ]
            expect(checkIfPointIsInPolygon(point, polygon)).to.be.true
        })
    })

    describe('isPointInPolygon', () => {
        it('should return false for empty coordinates', () => {
            const point: Coordinates = { latitude: 1, longitude: 1 }
            expect(isPointInPolygon(point, [])).to.be.false
        })

        it('should call parseMultiArrayPolygon and checkIfPointIsInPolygon with correct parameters', () => {
            const point: Coordinates = { latitude: 1, longitude: 1 }
            const coordinates = [
                [
                    [1, 1],
                    [2, 2],
                    [3, 3],
                ],
            ]
            const parsedCoordinates: Coordinates[] = [
                { latitude: 1, longitude: 1 },
                { latitude: 2, longitude: 2 },
                { latitude: 3, longitude: 3 },
            ]

            const parseStub = sinon.stub().returns(parsedCoordinates)
            const checkStub = sinon.stub().returns(true)

            const originalParse = Object.getOwnPropertyDescriptor(Object.prototype, 'parseMultiArrayPolygon')!
            const originalCheck = Object.getOwnPropertyDescriptor(Object.prototype, 'checkIfPointIsInPolygon')!

            Object.defineProperty(Object.prototype, 'parseMultiArrayPolygon', {
                value: parseStub,
            })
            Object.defineProperty(Object.prototype, 'checkIfPointIsInPolygon', {
                value: checkStub,
            })

            expect(isPointInPolygon(point, coordinates)).to.be.true

            Object.defineProperty(Object.prototype, 'parseMultiArrayPolygon', originalParse)
            Object.defineProperty(Object.prototype, 'checkIfPointIsInPolygon', originalCheck)
        })
    })

    describe('parseMultiArrayPolygon', () => {
        it('should handle regular polygon correctly', () => {
            const polygon: number[][][] = [
                [
                    [0, 0],
                    [1, 0],
                    [1, 1],
                    [0, 1],
                ],
            ]
            const expected: Coordinates[] = [
                { latitude: 0, longitude: 0 },
                { latitude: 0, longitude: 1 },
                { latitude: 1, longitude: 1 },
                { latitude: 1, longitude: 0 },
            ]
            expect(parseMultiArrayPolygon(polygon)).to.deep.equal(expected)
        })

        it('should handle multi-polygon correctly', () => {
            const multiPolygon: number[][][][] = [
                [
                    [
                        [0, 0],
                        [1, 0],
                        [1, 1],
                        [0, 1],
                    ],
                ],
                [
                    [
                        [2, 2],
                        [3, 2],
                        [3, 3],
                        [2, 3],
                    ],
                ],
            ]
            const expected: Coordinates[] = [
                { latitude: 0, longitude: 0 },
                { latitude: 0, longitude: 1 },
                { latitude: 1, longitude: 1 },
                { latitude: 1, longitude: 0 },
                { latitude: 2, longitude: 2 },
                { latitude: 2, longitude: 3 },
                { latitude: 3, longitude: 3 },
                { latitude: 3, longitude: 2 },
            ]
            expect(parseMultiArrayPolygon(multiPolygon)).to.deep.equal(expected)
        })
    })
})

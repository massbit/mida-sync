import { expect } from 'chai'
import {
    calculateDistanceInKm,
    checkIfPointIsInPolygon,
    Coordinates,
    isPointInPolygon,
    parseMultiArrayPolygon,
} from '../../src/utilites/geo'

describe('tests/utilities/geo.ts', () => {
    const polygon: Coordinates[] = [
        { latitude: 44.6235164615624, longitude: 11.5624588541649 },
        { latitude: 44.6230680699633, longitude: 11.5603490217124 },
        { latitude: 44.6221458585944, longitude: 11.5572393475763 },
        { latitude: 44.6236213897529, longitude: 11.5507608597928 },
        { latitude: 44.6263879095948, longitude: 11.5422092559185 },
        { latitude: 44.6260190479002, longitude: 11.53767431447 },
        { latitude: 44.6230680699633, longitude: 11.5236807808575 },
        { latitude: 44.6234543755753, longitude: 11.5213184344014 },
        { latitude: 44.6254888051078, longitude: 11.5088774362721 },
        { latitude: 44.6285088188526, longitude: 11.4993216667914 },
        { latitude: 44.6332667252, longitude: 11.4895045128982 },
        { latitude: 44.6371583644, longitude: 11.4972621488982 },
        { latitude: 44.6455139567, longitude: 11.5186747890981 },
        { latitude: 44.6530319648, longitude: 11.530480331398 },
        { latitude: 44.6505999367215, longitude: 11.5420592206857 },
        { latitude: 44.6486450824, longitude: 11.539067437598 },
        { latitude: 44.6381334987, longitude: 11.5506974278979 },
        { latitude: 44.6348557017, longitude: 11.5654760915978 },
        { latitude: 44.6334454265, longitude: 11.5702078494978 },
        { latitude: 44.6300523826, longitude: 11.5668223172978 },
        { latitude: 44.6235164615624, longitude: 11.5624588541649 },
    ]
    const multiPolygon: number[][][][] = [
        [
            [
                [11.5624588541649, 44.6235164615624],
                [11.5603490217124, 44.6230680699633],
                [11.5572393475763, 44.6221458585944],
                [11.5507608597928, 44.6236213897529],
                [11.5422092559185, 44.6263879095948],
                [11.53767431447, 44.6260190479002],
                [11.5236807808575, 44.6230680699633],
                [11.5213184344014, 44.6234543755753],
                [11.5088774362721, 44.6254888051078],
                [11.4993216667914, 44.6285088188526],
                [11.4895045128982, 44.6332667252],
                [11.4972621488982, 44.6371583644],
                [11.5186747890981, 44.6455139567],
                [11.530480331398, 44.6530319648],
                [11.5420592206857, 44.6505999367215],
                [11.539067437598, 44.6486450824],
                [11.5506974278979, 44.6381334987],
                [11.5654760915978, 44.6348557017],
                [11.5702078494978, 44.6334454265],
                [11.5668223172978, 44.6300523826],
            ],
        ],
    ]
    const positionInsidePolygon: Coordinates = { latitude: 44.630735, longitude: 11.500773 }
    const positionOutsidePolygon: Coordinates = { latitude: 44.5601578, longitude: 11.567565 }

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

    describe('checkIfPointIsInPolygon', () => {
        it('should return true when point is inside a polygon', () => {
            expect(checkIfPointIsInPolygon(positionInsidePolygon, polygon)).to.be.true
        })

        it('should return false when point is outside a polygon', () => {
            expect(checkIfPointIsInPolygon(positionOutsidePolygon, polygon)).to.be.false
        })

        it('should handle edge cases correctly', () => {
            const point: Coordinates = { latitude: 44.6235164615624, longitude: 11.5624588541649 }
            expect(checkIfPointIsInPolygon(point, polygon)).to.be.true
        })
    })

    describe('isPointInPolygon', () => {
        it('should return false for empty coordinates', () => {
            const point: Coordinates = { latitude: 1, longitude: 1 }
            expect(isPointInPolygon(point, [])).to.be.false
        })

        it('should call parseMultiArrayPolygon and checkIfPointIsInPolygon with correct parameters', () => {
            expect(isPointInPolygon(positionInsidePolygon, multiPolygon)).to.be.true
        })
    })

    describe('calculateDistanceInKm', () => {
        it('should calculate distance between two points in kilometers', () => {
            const point1: Coordinates = { latitude: 45.4777336, longitude: 9.1768417 }
            const point2: Coordinates = { latitude: 45.46362, longitude: 9.18812 }
            const distance = calculateDistanceInKm(point1, point2)
            console.log(`Distance: ${distance} km`)
            expect(distance).to.be.a('number')
            expect(distance).to.be.greaterThan(0)
        })
    })
})

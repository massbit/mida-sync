export interface Coordinates {
    latitude: number
    longitude: number
}

export const checkIfPointIsInPolygon = (point: Coordinates, polygon: Coordinates[]): boolean => {
    if (polygon.length < 3) return false
    
    let inside = false
    const x = point.longitude
    const y = point.latitude
    
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i].longitude
        const yi = polygon[i].latitude
        const xj = polygon[j].longitude
        const yj = polygon[j].latitude
        
        if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
            inside = !inside
        }
    }
    
    return inside
}

export const parseMultiArrayPolygon = (coordinates: number[][][] | number[][][][]): Coordinates[] => {
    let parsedCoordinates: Coordinates[] = []

    if (Array.isArray(coordinates[0][0][0]) && typeof coordinates[0][0][0][0] === 'number') {
        // Handle MultiPolygon
        const multiPolygon = coordinates as number[][][][]
        parsedCoordinates = multiPolygon.flatMap((polygon) =>
            polygon.flatMap((ring) => ring.map((coord) => ({ latitude: coord[1], longitude: coord[0] })))
        )
    } else {
        // Handle regular Polygon
        const polygon = coordinates as number[][][]
        parsedCoordinates = polygon.flatMap((ring) =>
            ring.map((coord) => ({ latitude: coord[1], longitude: coord[0] }))
        )
    }

    return parsedCoordinates
}

// Helper function to check if a point is inside a polygon
export const isPointInPolygon = (point: Coordinates, coordinates: number[][][] | number[][][][]): boolean => {
    if (coordinates.length === 0) return false

    const parsedCoordinates = parseMultiArrayPolygon(coordinates)

    return checkIfPointIsInPolygon(point, parsedCoordinates)
}

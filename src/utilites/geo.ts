export interface Coordinates {
    latitude: number
    longitude: number
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

export const checkIfPointIsInPolygon = (point: Coordinates, polygon: Coordinates[]): boolean => {
    if (polygon.length < 3) return false

    const x = point.longitude
    const y = point.latitude

    // Check if point is exactly on a vertex
    for (const vertex of polygon) {
        if (Math.abs(vertex.longitude - x) < 1e-10 && Math.abs(vertex.latitude - y) < 1e-10) {
            return true
        }
    }

    let inside = false

    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i].longitude
        const yi = polygon[i].latitude
        const xj = polygon[j].longitude
        const yj = polygon[j].latitude

        // Check if point is on the edge
        if (yi === yj && y === yi) {
            // Horizontal edge
            if (x >= Math.min(xi, xj) && x <= Math.max(xi, xj)) {
                return true
            }
        } else if (xi === xj && x === xi) {
            // Vertical edge
            if (y >= Math.min(yi, yj) && y <= Math.max(yi, yj)) {
                return true
            }
        } else if (yi !== yj) {
            // Check if point is on a non-horizontal edge
            const slope = (xj - xi) / (yj - yi)
            const expectedX = xi + slope * (y - yi)
            if (Math.abs(x - expectedX) < 1e-10 && y >= Math.min(yi, yj) && y <= Math.max(yi, yj)) {
                return true
            }
        }

        // Ray casting algorithm for points not on edges
        if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
            inside = !inside
        }
    }

    return inside
}

// Helper function to check if a point is inside a polygon
export const isPointInPolygon = (point: Coordinates, polygon: number[][][] | number[][][][]): boolean => {
    if (polygon.length === 0) return false

    const parsedCoordinates = parseMultiArrayPolygon(polygon)

    return checkIfPointIsInPolygon(point, parsedCoordinates)
}

export const calculateDistanceInKm = (point1: Coordinates, point2: Coordinates): number => {
    const toRadians = (degrees: number): number => degrees * (Math.PI / 180)

    const lat1 = toRadians(point1.latitude)
    const lon1 = toRadians(point1.longitude)
    const lat2 = toRadians(point2.latitude)
    const lon2 = toRadians(point2.longitude)

    const dlon = lon2 - lon1
    const dlat = lat2 - lat1

    const a = Math.sin(dlat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dlon / 2) ** 2
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

    // Radius of the Earth in kilometers
    const radiusOfEarthKm = 6371

    return radiusOfEarthKm * c
}

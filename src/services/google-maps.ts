import { GOOGLE_MAPS_API_KEY } from '../utilites/constants'
import { Coordinates } from '../utilites/geo'
import { RoutesClient } from '@googlemaps/routing'

export const getGoogleMapsRoute = async (
    from: Coordinates,
    to: Coordinates
): Promise<
    | {
          distance: string
          duration: string
      }
    | undefined
> => {
    const client = new RoutesClient({
        apiKey: GOOGLE_MAPS_API_KEY,
    })

    const routes = await client
        .computeRoutes(
            {
                origin: {
                    location: {
                        latLng: {
                            latitude: from.latitude,
                            longitude: from.longitude,
                        },
                    },
                },
                destination: {
                    location: {
                        latLng: {
                            latitude: to.latitude,
                            longitude: to.longitude,
                        },
                    },
                },
                travelMode: 'DRIVE',
            },
            {
                otherArgs: {
                    headers: {
                        'X-Goog-FieldMask': 'routes.distanceMeters,routes.duration',
                    },
                },
            }
        )
        .then((resp) => resp[0].routes)

    if (!routes || routes.length === 0) {
        return undefined
    }

    const route = routes[0]

    if (!route.distanceMeters || !route.duration || !route.duration.seconds) {
        return undefined
    }

    return {
        distance: (route.distanceMeters / 1000).toFixed(2), // Convert meters to kilometers
        duration: (Number(route.duration.seconds) / 60).toFixed(0), // Convert seconds to minutes
    }
}

import { config } from '../config/config'
import { Coordinates } from '../utilites/geo'
import { RoutesClient } from '@googlemaps/routing'
import { Client } from '@googlemaps/google-maps-services-js'

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
        apiKey: config.google_maps_api_key,
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

export const getAddressFromCoordinates = async (coordinates: Coordinates): Promise<string | undefined> => {
    const client = new Client()

    try {
        const response = await client
            .reverseGeocode({
                params: {
                    latlng: { lat: coordinates.latitude, lng: coordinates.longitude },
                    key: config.google_maps_api_key,
                },
            })
            .then((resp) => resp.data)

        if (response.results.length > 0) {
            return response.results[0].formatted_address
        }
    } catch (error) {
        console.error('Error fetching address:', error)
    }

    return undefined
}

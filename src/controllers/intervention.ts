import { getInterventionsFromNotifire, NotifireIntervention } from '../services/notifire'
import { MolinellaCoordinates } from '../utilites/constants'
import { calculateDistanceInKm, Coordinates, isPointInPolygon } from '../utilites/geo'
import * as BolognaTerritories from '../data/territories/bologna.json'
import * as FerraraTerritories from '../data/territories/ferrara.json'

interface FerraraTerritoryProperties {
    PRIMA_COMP: string | null
    SECONDA_CO: string | null
    TERZA_COMP: string | null
    QUARTA_COMP: string | null
}

interface BolognaTerritoryProperties {
    DISTAC1: string | null
    DISTAC2: string | null
    DISTAC3: string | null
}

interface Territory<T = FerraraTerritoryProperties | BolognaTerritoryProperties> {
    type: string
    features: {
        type: string
        id: number
        geometry: {
            type: string
            coordinates: number[][][] | number[][][][] // Support both Polygon and MultiPolygon
        }
        properties: T & { [key: string]: any }
    }[]
}

export interface ElaboratedIntervention {
    intervention: NotifireIntervention
    territory: Squads | null
    distance: number
}

export const syncNotifireData = async () => {
    const interventions = await getInterventionsFromNotifire()

    const parsedInterventions: ElaboratedIntervention[] = []

    for (let i = 0; i < interventions.length; i++) {
        const intervention = interventions[i]

        const territory = findTerritoryByLocation({
            latitude: intervention.latitude,
            longitude: intervention.longitude,
        })

        const distance = calculateDistanceInKm(
            { latitude: intervention.latitude, longitude: intervention.longitude },
            { latitude: MolinellaCoordinates.latitude, longitude: MolinellaCoordinates.longitude }
        )

        parsedInterventions.push({
            intervention,
            territory,
            distance,
        })
    }

    return parsedInterventions
}

interface Squads {
    [key: number]: string
}

const findTerritoryByLocation = (location: Coordinates): Squads | null => {
    const bolognaTerritories: Territory<BolognaTerritoryProperties> = BolognaTerritories
    const ferraraTerritories: Territory<FerraraTerritoryProperties> = FerraraTerritories

    const squads: Squads = {}

    // Check Bologna territories
    for (const feature of bolognaTerritories.features) {
        if (isPointInPolygon(location, feature.geometry.coordinates)) {
            if (feature.properties.DISTAC1) {
                squads[1] = feature.properties.DISTAC1
            }
            if (feature.properties.DISTAC2) {
                squads[2] = feature.properties.DISTAC2
            }
            if (feature.properties.DISTAC3) {
                squads[3] = feature.properties.DISTAC3
            }
        }
    }

    // Check Ferrara territories
    for (const feature of ferraraTerritories.features) {
        if (isPointInPolygon(location, feature.geometry.coordinates)) {
            if (feature.properties.PRIMA_COMP) {
                squads[1] = feature.properties.PRIMA_COMP
            }
            if (feature.properties.SECONDA_CO) {
                squads[2] = feature.properties.SECONDA_CO
            }
            if (feature.properties.TERZA_COMP) {
                squads[3] = feature.properties.TERZA_COMP
            }
            if (feature.properties.QUARTA_COMP) {
                squads[4] = feature.properties.QUARTA_COMP
            }
        }
    }

    if (Object.keys(squads).length > 0) {
        return squads
    }

    // Return null if the location is not in any territory
    return null
}

export const checkIfInterventionIsOfCompetence = (intervention: ElaboratedIntervention): boolean => {
    if (!intervention.territory) {
        return false
    }

    return (Object.values(intervention.territory) as string[]).some((value) => value.toUpperCase() === 'MOLINELLA')
}

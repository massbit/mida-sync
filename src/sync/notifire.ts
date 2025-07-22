import { getInterventionsFromNotifire } from '../services/notifire'
import * as BolognaTerritories from '../data/territories/bologna.json'
import * as FerraraTerritories from '../data/territories/ferrara.json'
import { Coordinates, isPointInPolygon } from '../utilites/geo'

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

export const syncNotifireData = async () => {
    const interventions = await getInterventionsFromNotifire()

    const parsedInterventions: {
        intervention: {}
        territory: Squads
    }[] = []

    for (let i = 0; i < interventions.length; i++) {
        const intervention = interventions[i]

        const territory = findTerritoryByLocation({
            latitude: intervention.latitude,
            longitude: intervention.longitude,
        })

        if (!territory) {
            continue
        }

        parsedInterventions.push({
            intervention,
            territory,
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

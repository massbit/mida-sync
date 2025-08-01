import { alertZones, MeteoAlertType, MeteoAlertZone } from './../services/meteo-alerts'
import { BaseMeteoAlert, MeteoAlert } from '../services/meteo-alerts'
import { omit } from 'lodash'

export interface ParsedMeteoAlert extends BaseMeteoAlert {
    id: string
    zoneData: MeteoAlertZone
    isCritic: boolean
    criticZoneData: Partial<MeteoAlertZone>
}

const correctColors: {
    [key in keyof MeteoAlertZone]: MeteoAlertZone[key][]
} = {
    ghiaccio_pioggia_gela: [null, MeteoAlertType.green],
    idraulica: [null, MeteoAlertType.green, MeteoAlertType.yellow],
    idrogeologica: [null, MeteoAlertType.green, MeteoAlertType.yellow],
    mareggiate: [null],
    neve: [null, MeteoAlertType.green],
    stato_mare: [null],
    temperature_estreme: [null, MeteoAlertType.green],
    temporali: [null, MeteoAlertType.green],
    vento: [null, MeteoAlertType.green],
}

const colorsToRemove = [null, MeteoAlertType.green]

const wordToRemove = /allerta|bollettino/i

export const parseMeteoAlert = (alert: MeteoAlert, zone: (typeof alertZones)[number]): ParsedMeteoAlert => {
    const zoneData = alert[zone]

    if (!zoneData) {
        throw new Error(`Zone ${zone} not found in alert data`)
    }

    const fileName = alert.link.split('/').pop()

    if (!fileName) {
        throw new Error(`Invalid link format: ${alert.link}`)
    }

    const id = fileName.replace('.pdf', '').replace('_', '/').replace(wordToRemove, '').trim()

    alert.link = `https://allertameteo.regione.emilia-romagna.it${alert.link}`

    const isCritic =
        Object.keys(zoneData).filter((key) => {
            const alertType = zoneData[key as keyof MeteoAlertZone]
            const allowedTypes = correctColors[key as keyof MeteoAlertZone]

            return allowedTypes && !allowedTypes.includes(alertType)
        }).length > 0

    const criticZoneData = Object.keys(zoneData).reduce((acc, key) => {
        const alertType = zoneData[key as keyof MeteoAlertZone]

        if (!colorsToRemove.includes(alertType)) {
            acc[key as keyof MeteoAlertZone] = alertType
        }

        return acc
    }, {} as Partial<MeteoAlertZone>)

    return {
        ...omit(alert, alertZones),
        id,
        zoneData,
        isCritic,
        criticZoneData,
    }
}

import { alertZones, MeteoAlertZone } from './../services/meteo-alerts'
import { BaseMeteoAlert, MeteoAlert } from '../services/meteo-alerts'
import { omit } from 'lodash'

export interface ParsedMeteoAlert extends BaseMeteoAlert {
    id: string
    zoneData: MeteoAlertZone
    isCritic: boolean
    criticZoneData: Partial<MeteoAlertZone>
}

const correctColors = ['green', null]
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

    const criticData = Object.keys(zoneData).filter((key) => !correctColors.includes(zoneData[key]))

    return {
        ...omit(alert, alertZones),
        id,
        zoneData,
        isCritic: criticData.length > 0,
        criticZoneData: criticData.reduce((acc, key) => {
            acc[key] = zoneData[key]
            return acc
        }, {} as Partial<MeteoAlertZone>),
    }
}

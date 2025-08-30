import axios from 'axios'
import customMoment from '../custom-components/custom-moment'

export enum MeteoAlertType {
    green = 'green',
    yellow = 'yellow',
    orange = 'orange',
    red = 'red',
}

export interface MeteoAlertZone {
    ghiaccio_pioggia_gela: MeteoAlertType | null
    idraulica: MeteoAlertType | null
    idrogeologica: MeteoAlertType | null
    mareggiate: MeteoAlertType | null
    neve: MeteoAlertType | null
    stato_mare: MeteoAlertType | null
    temperature_estreme: MeteoAlertType | null
    temporali: MeteoAlertType | null
    vento: MeteoAlertType | null
}

export const alertZones = [
    'A1',
    'A2',
    'B1',
    'B2',
    'C1',
    'C2',
    'D1',
    'D2',
    'D3',
    'E1',
    'E2',
    'F1',
    'F2',
    'F3',
    'G1',
    'G2',
    'H1',
    'H2',
] as const

export interface BaseMeteoAlert {
    dataEmissione: string
    titolo: string
    link: string
    dataInizio: string
    dataFine: string
    descrizionemeteo: string
}

export type MeteoAlertZoneData = {
    [key in (typeof alertZones)[number]]: MeteoAlertZone
}

export type MeteoAlert = BaseMeteoAlert & MeteoAlertZoneData

export const getTomorrowMeteoAlert = async (): Promise<MeteoAlert | undefined> => {
    const tomorrow = customMoment().add(1, 'day').format('YYYY-MM-DD HH:mm')

    return getMeteoAlert(tomorrow)
}

export const getMeteoAlert = async (date?: string): Promise<MeteoAlert | undefined> => {
    let baseUrl = 'https://allertameteo.regione.emilia-romagna.it/datiTempoReale-prevPiog-portlet/get-stato-allerta'

    if (date) {
        baseUrl += `?data=${date}`
    }

    const response = await axios.get<MeteoAlert | {}>(baseUrl).then((response) => response.data)

    if (Object.keys(response).length === 0) {
        return undefined
    }

    return response as MeteoAlert
}

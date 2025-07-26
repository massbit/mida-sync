import { database } from '..'

const tableName = 'django_models_intervention'

export interface Intervention {
    id: number
    uuid: string
    title: string
    position: {
        type: string
        coordinates: [number, number]
    }
    sender: string
    start_time: string
    type: number
    active: boolean
}

const parseIntervention = (data: Intervention & { position: string }): Intervention => {
    return {
        ...data,
        position: JSON.parse(data.position),
    }
}

export const getInterventionByUuid = async (uuid: string): Promise<Intervention | undefined> => {
    const query = `SELECT *, ST_AsGeoJSON(position) as position FROM ${tableName} WHERE uuid = $1`

    const result = await database.query<Intervention & { position: string }>(query, [uuid])

    return result.length > 0 ? parseIntervention(result[0]) : undefined
}

export const createIntervention = async (intervention: Omit<Intervention, 'id'>): Promise<Intervention> => {
    const query = `INSERT INTO ${tableName} (uuid, title, position, sender, start_time, type, active) 
                   VALUES ($1, $2, ST_SetSRID(ST_MakePoint($3, $4), 4326), $5, $6, $7, $8) 
                   RETURNING *`

    const values = [
        intervention.uuid,
        intervention.title,
        intervention.position.coordinates[0],
        intervention.position.coordinates[1],
        intervention.sender,
        intervention.start_time,
        intervention.type,
        intervention.active,
    ]

    const result = await database.query<Intervention & { position: string }>(query, values)

    return parseIntervention(result[0])
}

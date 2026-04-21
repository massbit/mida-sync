import { database } from '..'

const tableName = 'rivers'

export interface River {
    id: number
    station_id: string
    river_name: string
    station_name: string
    soglia1: number | null
    soglia2: number | null
    soglia3: number | null
    created_on: string
    updated_on: string
}

export type CreatableRiver = Omit<River, 'id' | 'created_on' | 'updated_on'>
export type RiverPatch = Partial<Omit<CreatableRiver, 'station_id'>>

export const getRivers = async (): Promise<River[]> => {
    const query = `SELECT * FROM ${tableName} ORDER BY id ASC`

    return database.query<River>(query)
}

export const getRiverById = async (id: number): Promise<River | undefined> => {
    const query = `SELECT * FROM ${tableName} WHERE id = $1`

    const rows = await database.query<River>(query, [id])

    return rows[0]
}

export const getRiverByStationId = async (stationId: string): Promise<River | undefined> => {
    const query = `SELECT * FROM ${tableName} WHERE station_id = $1`

    const rows = await database.query<River>(query, [stationId])

    return rows[0]
}

export const createRiver = async (river: CreatableRiver): Promise<River> => {
    const now = new Date().toISOString()

    return database.create<River>(tableName, { ...river, created_on: now, updated_on: now })
}

export const updateRiver = async (id: number, patch: RiverPatch): Promise<River> => {
    return database.edit<River>(tableName, { ...patch, updated_on: new Date().toISOString() }, id)
}

export const deleteRiver = async (id: number): Promise<void> => {
    await database.delete(tableName, id)
}

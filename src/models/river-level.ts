import { database } from '..'

const tableName = 'river_levels'

export interface RiverLevel {
    id: number
    river_id: number
    value: number
    measured_at: string
    soglia1_above: boolean | null
    soglia2_above: boolean | null
    soglia3_above: boolean | null
    created_on: string
}

export type CreatableRiverLevel = Omit<RiverLevel, 'id' | 'created_on'>

export const getLatestRiverLevel = async (riverId: number): Promise<RiverLevel | undefined> => {
    const query = `SELECT * FROM ${tableName} WHERE river_id = $1 ORDER BY created_on DESC, id DESC LIMIT 1`

    const rows = await database.query<RiverLevel>(query, [riverId])

    return rows[0]
}

export const createRiverLevel = async (level: CreatableRiverLevel): Promise<RiverLevel> => {
    return database.create<RiverLevel>(tableName, { ...level, created_on: new Date().toISOString() })
}

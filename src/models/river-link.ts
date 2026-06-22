import { database } from '..'

const tableName = 'river_links'

export interface RiverLink {
    id: number
    upstream_river_id: number
    downstream_river_id: number
    target_threshold: number
    lead_time_minutes: number | null
    precursor_level: number | null
    sample_size: number
    model_json: unknown | null
    last_calibrated_on: string | null
    created_on: string
    updated_on: string
}

export interface CreatableRiverLink {
    upstream_river_id: number
    downstream_river_id: number
    target_threshold?: number
}

export interface RiverLinkModelPatch {
    lead_time_minutes: number | null
    precursor_level: number | null
    sample_size: number
    model_json: unknown
}

export const getRiverLinks = async (): Promise<RiverLink[]> => {
    return database.query<RiverLink>(`SELECT * FROM ${tableName} ORDER BY id ASC`)
}

export const getRiverLinkById = async (id: number): Promise<RiverLink | undefined> => {
    const rows = await database.query<RiverLink>(`SELECT * FROM ${tableName} WHERE id = $1`, [id])

    return rows[0]
}

export const createRiverLink = async (link: CreatableRiverLink): Promise<RiverLink> => {
    const now = new Date().toISOString()

    return database.create<RiverLink>(tableName, {
        upstream_river_id: link.upstream_river_id,
        downstream_river_id: link.downstream_river_id,
        target_threshold: link.target_threshold ?? 1,
        lead_time_minutes: null,
        precursor_level: null,
        sample_size: 0,
        model_json: null,
        last_calibrated_on: null,
        created_on: now,
        updated_on: now,
    })
}

export const updateRiverLinkModel = async (id: number, patch: RiverLinkModelPatch): Promise<RiverLink> => {
    return database.edit<RiverLink>(
        tableName,
        {
            lead_time_minutes: patch.lead_time_minutes,
            precursor_level: patch.precursor_level,
            sample_size: patch.sample_size,
            model_json: patch.model_json === undefined ? null : JSON.stringify(patch.model_json),
            last_calibrated_on: new Date().toISOString(),
            updated_on: new Date().toISOString(),
        },
        id
    )
}

export const deleteRiverLink = async (id: number): Promise<void> => {
    await database.delete(tableName, id)
}

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
    // Order by measured_at (not created_on): a historical backfill inserts old measurements with a
    // current created_on, so created_on no longer tracks measurement recency.
    const query = `SELECT * FROM ${tableName} WHERE river_id = $1 ORDER BY measured_at DESC, id DESC LIMIT 1`

    const rows = await database.query<RiverLevel>(query, [riverId])

    return rows[0]
}

export const createRiverLevel = async (level: CreatableRiverLevel): Promise<RiverLevel> => {
    return database.create<RiverLevel>(tableName, { ...level, created_on: new Date().toISOString() })
}

/**
 * Inserts a reading only if no row already exists for the same (river_id, measured_at). Returns
 * the created row, or undefined when the reading was already stored. Relies on the
 * UNIQUE (river_id, measured_at) constraint and keeps the table from accumulating duplicate rows
 * when the sensor has not published a newer reading between polls.
 */
export const createRiverLevelIfNew = async (level: CreatableRiverLevel): Promise<RiverLevel | undefined> => {
    return database.createOrIgnore<RiverLevel>(
        tableName,
        { ...level, created_on: new Date().toISOString() },
        'river_id, measured_at'
    )
}

export const getRiverLevelsSince = async (riverId: number, since: string): Promise<RiverLevel[]> => {
    const query = `SELECT * FROM ${tableName} WHERE river_id = $1 AND measured_at >= $2 ORDER BY measured_at ASC`

    return database.query<RiverLevel>(query, [riverId, since])
}

export type BackfillRiverLevel = Omit<CreatableRiverLevel, never>

/**
 * Inserts many readings in one statement, skipping any (river_id, measured_at) already present.
 * Returns the number of rows actually inserted. Used by the historical backfill; callers must keep
 * each batch under the Postgres parameter limit (7 params per row).
 */
export const bulkInsertRiverLevels = async (rows: BackfillRiverLevel[]): Promise<number> => {
    if (rows.length === 0) {
        return 0
    }

    const now = new Date().toISOString()
    const values: (string | number | boolean | null)[] = []
    const tuples = rows.map((row, index) => {
        const base = index * 7
        values.push(
            row.river_id,
            row.value,
            row.measured_at,
            row.soglia1_above,
            row.soglia2_above,
            row.soglia3_above,
            now
        )
        return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7})`
    })

    const query = `INSERT INTO ${tableName}
        (river_id, value, measured_at, soglia1_above, soglia2_above, soglia3_above, created_on)
        VALUES ${tuples.join(', ')}
        ON CONFLICT (river_id, measured_at) DO NOTHING
        RETURNING id`

    const inserted = await database.query<{ id: number }>(query, values)

    return inserted.length
}

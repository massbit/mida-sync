import { database } from '..'

const tableName = 'link_predictions'

export type PredictionOutcome = 'pending' | 'hit' | 'miss'

export interface LinkPrediction {
    id: number
    link_id: number
    predicted_at: string
    predicted_exceedance_at: string
    upstream_value: number
    actual_exceedance_at: string | null
    outcome: PredictionOutcome
    created_on: string
}

export type CreatableLinkPrediction = Omit<LinkPrediction, 'id' | 'outcome' | 'actual_exceedance_at' | 'created_on'>

export const createLinkPrediction = async (prediction: CreatableLinkPrediction): Promise<LinkPrediction> => {
    return database.create<LinkPrediction>(tableName, {
        ...prediction,
        actual_exceedance_at: null,
        outcome: 'pending',
        created_on: new Date().toISOString(),
    })
}

export const getLatestLinkPrediction = async (linkId: number): Promise<LinkPrediction | undefined> => {
    const rows = await database.query<LinkPrediction>(
        `SELECT * FROM ${tableName} WHERE link_id = $1 ORDER BY predicted_at DESC, id DESC LIMIT 1`,
        [linkId]
    )

    return rows[0]
}

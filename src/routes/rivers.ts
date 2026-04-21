import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import {
    createRiver,
    deleteRiver,
    getRiverById,
    getRiverByStationId,
    getRivers,
    updateRiver,
} from '../models/river'
import { runRiverLevelCheck } from '../tasks/river-levels'

const nullableNumber = { type: ['number', 'null'] }

const createBodySchema = {
    type: 'object',
    required: ['station_id', 'river_name', 'station_name'],
    additionalProperties: false,
    properties: {
        station_id: { type: 'string', minLength: 1, maxLength: 64 },
        river_name: { type: 'string', minLength: 1, maxLength: 128 },
        station_name: { type: 'string', minLength: 1, maxLength: 128 },
        soglia1: nullableNumber,
        soglia2: nullableNumber,
        soglia3: nullableNumber,
    },
}

const patchBodySchema = {
    type: 'object',
    additionalProperties: false,
    minProperties: 1,
    properties: {
        river_name: { type: 'string', minLength: 1, maxLength: 128 },
        station_name: { type: 'string', minLength: 1, maxLength: 128 },
        soglia1: nullableNumber,
        soglia2: nullableNumber,
        soglia3: nullableNumber,
    },
}

const idParamSchema = {
    type: 'object',
    required: ['id'],
    additionalProperties: false,
    properties: {
        id: { type: 'integer', minimum: 1 },
    },
}

interface IdParams {
    id: number
}

interface CreateRiverBody {
    station_id: string
    river_name: string
    station_name: string
    soglia1?: number | null
    soglia2?: number | null
    soglia3?: number | null
}

interface PatchRiverBody {
    river_name?: string
    station_name?: string
    soglia1?: number | null
    soglia2?: number | null
    soglia3?: number | null
}

export const registerRiversRoutes = (fastify: FastifyInstance) => {
    fastify.route({
        method: 'GET',
        url: '/rivers',
        handler: async (_request: FastifyRequest, reply: FastifyReply) => {
            const rivers = await getRivers()
            reply.status(200).send(rivers)
        },
    })

    fastify.route<{ Body: CreateRiverBody }>({
        method: 'POST',
        url: '/rivers',
        schema: { body: createBodySchema },
        handler: async (request, reply) => {
            const existing = await getRiverByStationId(request.body.station_id)

            if (existing) {
                return reply.status(409).send({ error: 'Station already registered' })
            }

            const created = await createRiver({
                station_id: request.body.station_id,
                river_name: request.body.river_name,
                station_name: request.body.station_name,
                soglia1: request.body.soglia1 ?? null,
                soglia2: request.body.soglia2 ?? null,
                soglia3: request.body.soglia3 ?? null,
            })

            reply.status(201).send(created)
        },
    })

    fastify.route<{ Params: IdParams; Body: PatchRiverBody }>({
        method: 'PATCH',
        url: '/rivers/:id',
        schema: { params: idParamSchema, body: patchBodySchema },
        handler: async (request, reply) => {
            const river = await getRiverById(request.params.id)

            if (!river) {
                return reply.status(404).send({ error: 'River not found' })
            }

            const updated = await updateRiver(request.params.id, request.body)
            reply.status(200).send(updated)
        },
    })

    fastify.route<{ Params: IdParams }>({
        method: 'DELETE',
        url: '/rivers/:id',
        schema: { params: idParamSchema },
        handler: async (request, reply) => {
            const river = await getRiverById(request.params.id)

            if (!river) {
                return reply.status(404).send({ error: 'River not found' })
            }

            await deleteRiver(request.params.id)
            reply.status(204).send(undefined)
        },
    })

    fastify.route({
        method: 'POST',
        url: '/river-levels',
        schema: {
            body: { type: 'object', additionalProperties: false, maxProperties: 0 },
        },
        handler: async (_request: FastifyRequest, reply: FastifyReply) => {
            const summary = await runRiverLevelCheck()
            reply.status(200).send(summary)
        },
    })
}

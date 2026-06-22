import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { getRiverById } from '../models/river'
import { createRiverLink, deleteRiverLink, getRiverLinkById, getRiverLinks } from '../models/river-link'
import { runFloodCalibration } from '../tasks/flood-calibration'
import { runFloodPrediction } from '../tasks/flood-prediction'
import { runFloodBackfill } from '../tasks/flood-backfill'
import logger from '../logger'

const createBodySchema = {
    type: 'object',
    required: ['upstream_river_id', 'downstream_river_id'],
    additionalProperties: false,
    properties: {
        upstream_river_id: { type: 'integer', minimum: 1 },
        downstream_river_id: { type: 'integer', minimum: 1 },
        target_threshold: { type: 'integer', minimum: 1, maximum: 3 },
    },
}

const idParamSchema = {
    type: 'object',
    required: ['id'],
    additionalProperties: false,
    properties: { id: { type: 'integer', minimum: 1 } },
}

interface IdParams {
    id: number
}

interface CreateLinkBody {
    upstream_river_id: number
    downstream_river_id: number
    target_threshold?: number
}

const emptyBodySchema = { type: 'object', additionalProperties: false, maxProperties: 0 }

const monthPattern = '^[0-9]{4}-(0[1-9]|1[0-2])$'
const backfillBodySchema = {
    type: 'object',
    required: ['from', 'to'],
    additionalProperties: false,
    properties: {
        from: { type: 'string', pattern: monthPattern },
        to: { type: 'string', pattern: monthPattern },
    },
}

interface BackfillBody {
    from: string
    to: string
}

export const registerRiverLinksRoutes = (fastify: FastifyInstance) => {
    fastify.route({
        method: 'GET',
        url: '/river-links',
        handler: async (_request: FastifyRequest, reply: FastifyReply) => {
            reply.status(200).send(await getRiverLinks())
        },
    })

    fastify.route<{ Body: CreateLinkBody }>({
        method: 'POST',
        url: '/river-links',
        schema: { body: createBodySchema },
        handler: async (request, reply) => {
            const { upstream_river_id, downstream_river_id, target_threshold } = request.body

            if (upstream_river_id === downstream_river_id) {
                return reply.status(400).send({ error: 'upstream and downstream must differ' })
            }

            const [upstream, downstream] = await Promise.all([
                getRiverById(upstream_river_id),
                getRiverById(downstream_river_id),
            ])

            if (!upstream || !downstream) {
                return reply.status(404).send({ error: 'upstream or downstream river not found' })
            }

            const created = await createRiverLink({ upstream_river_id, downstream_river_id, target_threshold })
            reply.status(201).send(created)
        },
    })

    fastify.route<{ Params: IdParams }>({
        method: 'DELETE',
        url: '/river-links/:id',
        schema: { params: idParamSchema },
        handler: async (request, reply) => {
            const link = await getRiverLinkById(request.params.id)

            if (!link) {
                return reply.status(404).send({ error: 'River link not found' })
            }

            await deleteRiverLink(request.params.id)
            reply.status(204).send(undefined)
        },
    })

    fastify.route({
        method: 'POST',
        url: '/flood-calibration',
        schema: { body: emptyBodySchema },
        handler: async (_request: FastifyRequest, reply: FastifyReply) => {
            reply.status(200).send(await runFloodCalibration())
        },
    })

    fastify.route({
        method: 'POST',
        url: '/flood-prediction',
        schema: { body: emptyBodySchema },
        handler: async (_request: FastifyRequest, reply: FastifyReply) => {
            reply.status(200).send(await runFloodPrediction())
        },
    })

    // Backfill runs for minutes (downloads/parses monthly archives), well beyond the request
    // timeout, so it is started in the background and the caller gets an immediate acknowledgement.
    fastify.route<{ Body: BackfillBody }>({
        method: 'POST',
        url: '/flood-backfill',
        schema: { body: backfillBodySchema },
        handler: async (request, reply) => {
            const { from, to } = request.body

            void runFloodBackfill(from, to)
                .then((summary) => logger.info({ summary }, 'Flood backfill finished'))
                .catch((err) => logger.error({ err }, 'Flood backfill failed'))

            reply.status(202).send({ status: 'started', from, to })
        },
    })
}

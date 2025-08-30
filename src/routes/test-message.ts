import { InlineKeyboardButton } from 'telegraf/typings/core/types/typegram'
import { sendTelegramMessage } from '../services/telegram'
import { config } from '../config/config'

export const registerTestMessageRoutes = (fastify) => {
    fastify.route({
        method: 'POST',
        url: '/test-message',
        handler: async (_, reply) => {
            const buttons: InlineKeyboardButton[][] = [
                [
                    { text: '1', url: 'https://google.com' },
                    { text: '2', url: 'https://apple.com' },
                    { text: '3', url: 'https://waze.com' },
                ],
                [
                    {
                        text: 'Seconda riga',
                        url: 'https://example.com',
                    },
                ],
            ]

            await sendTelegramMessage(config.chat_id, 'Prova messaggio', {
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: buttons,
                },
            })

            reply.status(204).send(undefined)
        },
    })
}

import * as Telegram from 'telegraf'
import { TELEGRAM_2_TOKEN } from '../utilites/constants'

const bot = new Telegram.Telegraf(TELEGRAM_2_TOKEN)

export const sendTelegramMessage = async (chatId: string, text: string, extra?: Telegram.Types.ExtraReplyMessage) => {
    await bot.telegram.sendMessage(chatId, text, extra)
}

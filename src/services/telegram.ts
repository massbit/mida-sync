import * as Telegram from 'telegraf'
import { config } from '../config/config'

const bot = new Telegram.Telegraf(config.telegram_token)

export const sendTelegramMessage = async (chatId: string, text: string, extra?: Telegram.Types.ExtraReplyMessage) => {
    await bot.telegram.sendMessage(chatId, text, extra)
}

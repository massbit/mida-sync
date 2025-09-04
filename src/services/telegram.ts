import * as Telegram from 'telegraf'
import { config } from '../config/config'

const bot = new Telegram.Telegraf(config.telegram_token)

export const sendTelegramMessage = async (chatId: string, text: string, extra?: Telegram.Types.ExtraReplyMessage) => {
    await bot.telegram.sendMessage(chatId, text, extra)
}

export const sendPhotoMessage = async (chatId: string, photoUrl: string, caption?: string, extra?: Telegram.Types.ExtraPhoto) => {
    await bot.telegram.sendPhoto(chatId, photoUrl, { caption, ...extra })
}

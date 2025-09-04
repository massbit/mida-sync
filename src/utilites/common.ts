import i18next, { TOptions } from 'i18next'

export const translateKey = (key: string, language: string, options: TOptions = {}) => {
    return i18next.t(key, { lng: language, ...options })
}

export const toFirstLetterUpperCase = (str: string) => {
    return str.charAt(0).toUpperCase() + str.slice(1)
}

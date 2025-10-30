import axios from 'axios'
import moment from 'moment'
import { toFirstLetterUpperCase } from '../utilites/common'
import customMoment from '../custom-components/custom-moment'

export const getPretempReport = async (date: moment.Moment) => {
    const formattedDate = date.format('DD_MM_YYYY')
    const month = date.format('MMMM').toLowerCase()
    const urls = [
        `https://pretemp.altervista.org/archivio/${date.year()}/${month}/cartine/${formattedDate}.png`,
        `https://pretemp.altervista.org/archivio/${date.year()}/${toFirstLetterUpperCase(month)}/cartine/${formattedDate}.png`,
    ]

    let image: string | undefined = undefined

    for (let i = 0; i < urls.length; i++) {
        const url = urls[i]

        try {
            await axios.head(url)
        } catch {
            continue
        }

        image = url
    }

    return image
}

export const getTomorrowPretempReport = async () => {
    const tomorrow = customMoment().add(1, 'day')
    return getPretempReport(tomorrow)
}

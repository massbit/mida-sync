import customMoment from '../custom-components/custom-moment'
import { WORK_SHIFTS } from './constants'
import i18next, { TOptions } from 'i18next'

export interface Workshift {
    shift: string
    night: boolean
}

interface WorkHours {
    start: string
    end: string
}

const permanentWorkHours: WorkHours = {
    start: '08:00',
    end: '20:00',
}

const volunteerWorkHours: WorkHours = {
    start: '07:00',
    end: '20:00',
}

/**
 * Calculates the current work shift based on a fixed start date.
 * @returns The current work shift and whether it is a night shift.
 */
export const getActualWorkShift = (isVolunteer: boolean): Workshift => {
    const startDate = customMoment('01/01/2019', 'DD/MM/YYYY')
    const nowDate = customMoment()

    const workHours = isVolunteer ? volunteerWorkHours : permanentWorkHours

    // Check if it's day shift (after 8:00)
    const shiftChanged = customMoment(workHours.start, 'HH:mm') <= nowDate

    // Check if it's night shift (after 20:00)
    const nightShift = customMoment(workHours.end, 'HH:mm') <= nowDate || !shiftChanged

    // Get the difference in days between the two dates
    const dayDiff = nowDate.diff(startDate, 'day')

    // Calculate today's shift
    let shiftIndex = (dayDiff % 4) - (shiftChanged ? 0 : 1) - (nightShift && !isVolunteer ? 1 : 0)

    if (shiftIndex < 0) {
        shiftIndex += 4
    }

    const shift = WORK_SHIFTS[shiftIndex]

    return {
        shift,
        night: nightShift,
    }
}

export const translateKey = (key: string, language: string, options: TOptions = {}) => {
    return i18next.t(key, { lng: language, ...options })
}

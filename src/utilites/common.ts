import customMoment from '../custom-components/custom-moment'
import { WORK_SHIFTS } from './constants'

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
    end: '15:00',
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
    const shiftChanged = customMoment(workHours.start, 'HH:mm') < nowDate

    // Check if it's night shift (after 20:00)
    const nightShift = customMoment(workHours.end, 'HH:mm') < nowDate

    // Get the difference in days between the two dates
    const dayDiff = nowDate.diff(startDate, 'day')

    // Calculate today's shift
    const shiftIndex = (dayDiff % 4) - (shiftChanged ? 0 : 1) - (nightShift && !isVolunteer ? 1 : 0)

    return {
        shift: WORK_SHIFTS[shiftIndex],
        night: nightShift,
    }
}

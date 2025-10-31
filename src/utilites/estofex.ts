import customMoment from '../custom-components/custom-moment'
import { EstofexReport } from '../services/estofex'

export const checkEstofexReport = (report: EstofexReport): boolean => {
    if (!report.forecast || !report.forecast.start_time || !report.forecast.expiry_time) {
        return false
    }

    if (!report.forecast.start_time['@_value'] || !report.forecast.expiry_time['@_value']) {
        return false
    }

    const startTime = customMoment(parseInt(report.forecast.start_time['@_value'], 10))
    const expiryTime = customMoment(parseInt(report.forecast.expiry_time['@_value'], 10))

    const tomorrow = customMoment().add(1, 'day')

    return startTime.isBefore(tomorrow) && expiryTime.isAfter(tomorrow)
}

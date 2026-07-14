import customMoment from '../custom-components/custom-moment'
import { EstofexReport } from '../services/estofex'

export const checkEstofexReport = (report: EstofexReport): boolean => {
    if (!report.forecast || !report.forecast.start_time || !report.forecast.expiry_time) {
        return false
    }

    if (!report.forecast.start_time['@_value'] || !report.forecast.expiry_time['@_value']) {
        return false
    }

    // Estofex emits start/expiry as a UTC 'YYYYMMDDHH' string (e.g. "2026071506"), NOT an epoch.
    // Parsing it as a number and feeding moment() read it as ms-since-epoch (Jan 1970), so the
    // window never straddled "tomorrow" and the report was always skipped.
    const startTime = customMoment.utc(report.forecast.start_time['@_value'], 'YYYYMMDDHH')
    const expiryTime = customMoment.utc(report.forecast.expiry_time['@_value'], 'YYYYMMDDHH')

    const tomorrow = customMoment().add(1, 'day')

    return startTime.isBefore(tomorrow) && expiryTime.isAfter(tomorrow)
}

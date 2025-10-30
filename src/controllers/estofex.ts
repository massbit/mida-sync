import { EstofexReport } from '../services/estofex'

export const checkEstofexReport = (report: EstofexReport): boolean => {
    if (!report.forecast || !report.forecast.start_time || !report.forecast.expiry_time) {
        return false
    }

    return true
}

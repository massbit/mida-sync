import moment from 'moment/min/moment-with-locales'

moment.locale('it')

type customMoment = typeof moment
export default moment as customMoment

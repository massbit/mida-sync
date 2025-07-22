import { ElaboratedIntervention } from '../sync/notifire'

export const checkIfInterventionIsOfCompetence = (intervention: ElaboratedIntervention): boolean => {
    return (Object.values(intervention.territory) as string[]).some((value) => value.toUpperCase() === 'MOLINELLA')
}

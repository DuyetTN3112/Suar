import type { AuthSessionObservation } from '#modules/auth/domain/session-management/auth_session_observation'

export abstract class AuthSessionObservationStager {
  abstract stage(observation: AuthSessionObservation): Promise<void>
}

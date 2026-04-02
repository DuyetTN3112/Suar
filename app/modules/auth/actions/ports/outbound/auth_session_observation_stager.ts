import type { AuthSessionObservation } from '#modules/auth/domain/auth_session_observation'

export abstract class AuthSessionObservationStager {
  abstract stage(observation: AuthSessionObservation): Promise<void>
}

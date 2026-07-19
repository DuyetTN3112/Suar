export interface AuthorizeSearchIndexOperatorInput {
  assertedActorId?: string | undefined
}

export interface AuthorizedSearchIndexOperator {
  id: string
  systemRole: string
  actorType: 'service' | 'human'
  authenticationProvenance: 'runtime_environment' | 'session'
}

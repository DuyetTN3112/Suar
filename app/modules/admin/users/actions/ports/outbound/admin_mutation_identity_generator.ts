export interface AdminMutationIdentity {
  mutationId: string
  occurredAt: string
}

export abstract class AdminMutationIdentityGenerator {
  abstract next(): AdminMutationIdentity
}

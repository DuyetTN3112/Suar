import type {
  AccomplishmentLifecycleStateV1,
  AccomplishmentVisibilityV1,
} from '#modules/accomplishments/public_contracts/verified-work/accomplishment_contract_primitives_v1'
import type { AccomplishmentLifecycleRevisionV1 } from '#modules/accomplishments/public_contracts/lifecycle/accomplishment_lifecycle_v1'
import type { TvaSha256 } from '#modules/tasks/public_contracts/task-authoring/primitives'

export interface GovernAccomplishmentLifecycleInput {
  readonly accomplishmentId: string
  readonly expectedLifecycleRevisionId: string
  readonly expectedLifecycleSequence: number
  readonly expectedLifecycleState: AccomplishmentLifecycleStateV1
  readonly expectedVisibility: AccomplishmentVisibilityV1
  readonly nextLifecycleState: AccomplishmentLifecycleStateV1
  readonly nextVisibility: AccomplishmentVisibilityV1
  readonly reasonCode: AccomplishmentLifecycleRevisionV1['reasonCode']
  readonly sourceFact: AccomplishmentLifecycleRevisionV1['sourceFact']
  readonly actor: AccomplishmentLifecycleRevisionV1['actor']
  readonly policyVersion: string
  readonly relatedAccomplishmentId: string | null
  readonly occurredAt: string
}

export interface PersistedAccomplishmentLifecycleTransition {
  readonly inserted: boolean
  readonly revision: AccomplishmentLifecycleRevisionV1
  readonly currentLifecycleState: AccomplishmentLifecycleStateV1
  readonly currentVisibility: AccomplishmentVisibilityV1
  readonly currentCanonicalHash: TvaSha256
}

export interface AccomplishmentLifecycleGovernanceWriter {
  transition(
    input: GovernAccomplishmentLifecycleInput
  ): Promise<PersistedAccomplishmentLifecycleTransition>
}

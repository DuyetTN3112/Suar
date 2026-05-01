import type { AccomplishmentTransaction } from '#modules/accomplishments/actions/ports/outbound/accomplishment_transaction'
import type { AccomplishmentPublicProjectionV1 } from '#modules/accomplishments/public_contracts/publication/accomplishment_public_projection_v1'

export type UnversionedAccomplishmentPublicProjection = Omit<
  AccomplishmentPublicProjectionV1,
  'publicationVersion'
>

export interface CreateAccomplishmentPublicProjectionInput {
  readonly projectionKey: string
  readonly projection: UnversionedAccomplishmentPublicProjection
}

export interface PersistedAccomplishmentPublicProjectionResult {
  readonly inserted: boolean
  readonly projection: AccomplishmentPublicProjectionV1
}

export interface RetireActiveAccomplishmentPublicProjectionInput {
  readonly accomplishmentId: string
  readonly subjectUserId: string
  readonly projectionId: string
  readonly publicationVersion: number
  readonly retiredAt: string
}

export interface RetiredAccomplishmentPublicProjectionResult {
  readonly changed: boolean
  readonly projectionId: string | null
  readonly publicationVersion: number | null
  readonly retiredAt: string | null
}

export interface AccomplishmentPublicProjectionWriter {
  publish(
    input: CreateAccomplishmentPublicProjectionInput,
    transaction?: AccomplishmentTransaction
  ): Promise<PersistedAccomplishmentPublicProjectionResult>

  retireActive(
    input: RetireActiveAccomplishmentPublicProjectionInput,
    transaction?: AccomplishmentTransaction
  ): Promise<RetiredAccomplishmentPublicProjectionResult>
}

import type { AccomplishmentPublicProjectionV1 } from '#modules/accomplishments/public_contracts/publication/accomplishment_public_projection_v1'

export interface AccomplishmentPublicProjectionPage {
  readonly items: readonly AccomplishmentPublicProjectionV1[]
  readonly nextCursor: string | null
}

export interface AccomplishmentPublicProjectionReader {
  findActiveById(id: string): Promise<AccomplishmentPublicProjectionV1 | null>
  listActiveForUser(input: {
    readonly userId: string
    readonly limit: number
    readonly cursor?: string
  }): Promise<AccomplishmentPublicProjectionPage>
}

export interface OrganizationSearchDocument {
  organization_id: string
  name: string
  slug: string
  description: string | null
  website: string | null
  logo: string | null
  deleted_at: string | null
  updated_at: string
}

export interface OrganizationSearchHit {
  organizationId: string
  score: number
}

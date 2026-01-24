export type OrganizationProjectVisibility = 'public' | 'private' | 'team'

export interface OrganizationProjectCreateInput {
  name: string
  description?: string
  organization_id: string
  status?: string
  start_date?: string | null
  end_date?: string | null
  manager_id?: string | null
  visibility?: OrganizationProjectVisibility
}

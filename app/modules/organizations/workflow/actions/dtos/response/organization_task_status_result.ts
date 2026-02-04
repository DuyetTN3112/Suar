export interface OrganizationTaskStatusResult {
  id: string
  organization_id: string
  name: string
  slug: string
  category: string
  color: string
  icon: string | null
  description: string | null
  sort_order: number
  is_default: boolean
  is_system: boolean
}

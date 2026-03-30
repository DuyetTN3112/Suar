export interface OrganizationTaskStatusCreateInput {
  name: string
  slug: string
  category: string
  color?: string
  icon?: string
  description?: string
  sort_order?: number
}

export interface TaskStatusResponse {
  id: string
  organizationId: string
  name: string
  slug: string
  group: string
  color: string
  icon: string | null
  description: string | null
  sortOrder: number
  isDefault: boolean
  isSystem: boolean
  createdAt: string | null
  updatedAt: string | null
}

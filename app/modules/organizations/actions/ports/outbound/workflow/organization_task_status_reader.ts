export interface OrganizationTaskStatusItem {
  id: string
  name: string
  color: string
  order: number
  isDefault: boolean
}

export abstract class OrganizationTaskStatusReader {
  abstract listByOrganization(organizationId: string): Promise<OrganizationTaskStatusItem[]>
}

export interface InertiaProjectOption {
  id: string
  name: string
  canEnter?: boolean
}

export abstract class InertiaProjectDirectory {
  abstract listAccessibleByOrganization(input: {
    organizationId: string
    userId: string
    canManageOrganization: boolean
  }): Promise<InertiaProjectOption[]>
}

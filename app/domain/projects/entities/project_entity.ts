/**
 * ProjectEntity — Pure Domain Entity
 *
 * Represents a Project in the business domain.
 * 100% pure TypeScript, NO framework dependencies.
 * All business logic related to project state lives here.
 */

export type ProjectStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled'

export interface CustomRoleDefinition {
  name: string
  permissions: string[]
  description?: string
}
export type ProjectVisibility = 'public' | 'private' | 'team'

export interface ProjectEntityProps {
  id: string
  creatorId: string
  name: string
  description: string | null
  organizationId: string
  startDate: Date | null
  endDate: Date | null
  status: ProjectStatus
  budget: string
  managerId: string | null
  ownerId: string | null
  visibility: ProjectVisibility
  allowFreelancer: boolean
  approvalRequiredForMembers: boolean
  tags: unknown[] | null
  customRoles: CustomRoleDefinition[] | null
  deletedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export class ProjectEntity {
  readonly id: string
  readonly creatorId: string
  readonly name: string
  readonly description: string | null
  readonly organizationId: string
  readonly startDate: Date | null
  readonly endDate: Date | null
  readonly status: ProjectStatus
  readonly budget: string
  readonly managerId: string | null
  readonly ownerId: string | null
  readonly visibility: ProjectVisibility
  readonly allowFreelancer: boolean
  readonly approvalRequiredForMembers: boolean
  readonly tags: unknown[] | null
  readonly customRoles: CustomRoleDefinition[] | null
  readonly deletedAt: Date | null
  readonly createdAt: Date
  readonly updatedAt: Date

  constructor(props: ProjectEntityProps) {
    this.id = props.id
    this.creatorId = props.creatorId
    this.name = props.name
    this.description = props.description
    this.organizationId = props.organizationId
    this.startDate = props.startDate
    this.endDate = props.endDate
    this.status = props.status
    this.budget = props.budget
    this.managerId = props.managerId
    this.ownerId = props.ownerId
    this.visibility = props.visibility
    this.allowFreelancer = props.allowFreelancer
    this.approvalRequiredForMembers = props.approvalRequiredForMembers
    this.tags = props.tags
    this.customRoles = props.customRoles
    this.deletedAt = props.deletedAt
    this.createdAt = props.createdAt
    this.updatedAt = props.updatedAt
  }

  get isActive(): boolean {
    return this.status === 'in_progress' && this.deletedAt === null
  }

  get isCompleted(): boolean {
    return this.status === 'completed'
  }

  get isDeleted(): boolean {
    return this.deletedAt !== null
  }

  get isPublic(): boolean {
    return this.visibility === 'public'
  }

  get allowsFreelancers(): boolean {
    return this.allowFreelancer
  }
}

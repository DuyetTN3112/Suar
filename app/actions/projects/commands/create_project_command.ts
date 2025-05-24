import { HttpContext } from '@adonisjs/core/http'
import { BaseCommand } from '#actions/shared/base_command'
import { CreateProjectDTO } from '../dtos/index.js'
import Project from '#models/project'

/**
 * Command to create a new project
 *
 * Business Rules:
 * - Only superadmins of the organization can create projects
 * - Creator automatically becomes first member with 'owner' role
 * - Default status is 'pending' (status_id: 1)
 * - Manager defaults to creator if not specified
 * - All operations in a transaction (rollback on any error)
 *
 * @extends {BaseCommand<CreateProjectDTO, Project>}
 */
export default class CreateProjectCommand extends BaseCommand<CreateProjectDTO, Project> {
  constructor(ctx: HttpContext) {
    super(ctx)
  }

  /**
   * Execute the command
   *
   * @param dto - Validated CreateProjectDTO
   * @returns Created project with relations
   */
  async handle(dto: CreateProjectDTO): Promise<Project> {
    const user = this.getCurrentUser()

    return await this.executeInTransaction(async (trx) => {
      // 1. Check user is superadmin of the organization
      await this.validateSuperAdmin(user.id, dto.organization_id, trx)

      // 2. Create the project
      const project = await this.createProject(dto, user.id, trx)

      // 3. Add creator as first member (owner role)
      await this.addCreatorAsMember(project.id, user.id, trx)

      // 4. Log audit trail
      await this.logAudit('create', 'project', project.id, null, project.toJSON())

      // 5. Load and return project with relations
      return await this.loadProjectWithRelations(project.id, trx)
    })
  }

  /**
   * Validate user is superadmin of the organization
   */
  private async validateSuperAdmin(
    userId: number,
    organizationId: number,
    trx: any
  ): Promise<void> {
    const result = await trx
      .from('organization_users')
      .where('user_id', userId)
      .where('organization_id', organizationId)
      .where('role_id', 1) // role_id = 1 is superadmin
      .where('status', 'approved')
      .first()

    if (!result) {
      throw new Error('Chỉ superadmin của tổ chức mới có thể tạo dự án')
    }
  }

  /**
   * Create the project record
   */
  private async createProject(
    dto: CreateProjectDTO,
    creatorId: number,
    trx: any
  ): Promise<Project> {
    const projectData = dto.toObject()

    const project = await Project.create(
      {
        ...projectData,
        creator_id: creatorId,
        owner_id: creatorId,
        manager_id: projectData.manager_id || creatorId, // Default manager to creator
      },
      { client: trx }
    )

    return project
  }

  /**
   * Add creator as first project member with 'owner' role
   */
  private async addCreatorAsMember(projectId: number, userId: number, trx: any): Promise<void> {
    await trx.table('project_members').insert({
      project_id: projectId,
      user_id: userId,
      role: 'owner',
      created_at: new Date(),
    })
  }

  /**
   * Load project with all necessary relations
   */
  private async loadProjectWithRelations(projectId: number, trx: any): Promise<Project> {
    const project = await Project.query({ client: trx })
      .where('id', projectId)
      .preload('creator')
      .preload('manager')
      .preload('organization')
      .firstOrFail()

    return project
  }
}

import type { HttpContext } from '@adonisjs/core/http'
import { BaseCommand } from '#actions/shared/base_command'
import type { CreateProjectDTO } from '../dtos/index.js'
import Project from '#models/project'
import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

/**
 * Command to create a new project
 *
 * Di chuyển logic từ database triggers:
 * - before_insert_project: Check permission can_create_project, set owner_id, manager_id
 * - after_project_insert: Add owner to project_members với project_role_id = 1
 *
 * Business Rules:
 * - Check permission can_create_project (từ trigger before_insert_project)
 * - Owner mặc định là creator
 * - Manager mặc định là owner
 * - Creator tự động thành project_members với role owner (project_role_id = 1)
 *
 * @extends {BaseCommand<CreateProjectDTO, Project>}
 */
export default class CreateProjectCommand extends BaseCommand<CreateProjectDTO, Project> {
  constructor(ctx: HttpContext) {
    super(ctx)
  }

  async handle(dto: CreateProjectDTO): Promise<Project> {
    const user = this.getCurrentUser()

    return await this.executeInTransaction(async (trx) => {
      // 1. Check permission can_create_project (logic từ procedure)
      const hasPermission = await this.checkOrgPermission(
        user.id,
        dto.organization_id,
        'can_create_project',
        trx
      )

      if (!hasPermission) {
        throw new Error('Chỉ org_admin và org_owner mới có thể tạo project')
      }

      // 2. Validate status_id exists (logic từ procedure)
      if (dto.status_id) {
        await this.validateStatusId(dto.status_id, trx)
      }

      // 3. Validate dates (logic từ procedure)
      if (dto.start_date && dto.end_date) {
        if (dto.start_date > dto.end_date) {
          throw new Error('Start date không được lớn hơn end date')
        }
      }

      // 4. Validate user is org member
      await this.validateOrgMembership(user.id, dto.organization_id, trx)

      // 5. Set owner_id and manager_id
      const ownerId = user.id
      const managerId = dto.manager_id || ownerId

      // 6. Create the project
      const project = await Project.create(
        {
          name: dto.name,
          description: dto.description || null,
          organization_id: dto.organization_id,
          creator_id: user.id,
          owner_id: ownerId,
          manager_id: managerId,
          status_id: dto.status_id || 1,
          visibility: dto.visibility || 'team',
          start_date: dto.start_date || null,
          end_date: dto.end_date || null,
          budget: dto.budget || 0,
        },
        { client: trx }
      )

      // 7. Add owner as project member (from trigger)
      await db
        .table('project_members')
        .insert({
          project_id: project.id,
          user_id: ownerId,
          project_role_id: 1,
          created_at: new Date(),
        })
        .useTransaction(trx)

      // 8. Log audit trail
      await this.logAudit('create', 'project', project.id, null, project.toJSON())

      // 9. Send notification (từ procedure - outside transaction)
      this.sendProjectCreatedNotification(project, user.id).catch((err) => {
        console.error('[CreateProjectCommand] Failed to send notification:', err)
      })

      // 10. Load and return project with relations
      return await this.loadProjectWithRelations(project.id, trx)
    })
  }

  /**
   * Validate status_id exists
   * Logic từ procedure: IF NOT EXISTS (SELECT 1 FROM project_status WHERE id = p_status_id)
   */
  private async validateStatusId(statusId: number, trx: TransactionClientContract): Promise<void> {
    const status = await db.from('project_status').where('id', statusId).useTransaction(trx).first()

    if (!status) {
      throw new Error('Status ID không hợp lệ')
    }
  }

  /**
   * Send project created notification
   * Logic từ procedure: CALL create_notification(...)
   */
  private async sendProjectCreatedNotification(project: Project, userId: number): Promise<void> {
    // Note: Cần inject CreateNotification action nếu muốn dùng
    // Tạm thời log để track
    console.log(
      `[CreateProjectCommand] Notification: Project "${project.name}" created for user ${userId}`
    )
  }

  /**
   * Validate user is approved member of organization
   * Logic từ before_insert_project_member trigger:
   *   SELECT COUNT(*) FROM organization_users ou
   *   JOIN projects p ON ou.organization_id = p.organization_id
   *   WHERE ou.user_id = NEW.user_id AND p.id = NEW.project_id AND ou.status = 'approved'
   */
  private async validateOrgMembership(
    userId: number,
    organizationId: number,
    trx: TransactionClientContract
  ): Promise<void> {
    const membership = await db
      .from('organization_users')
      .where('organization_id', organizationId)
      .where('user_id', userId)
      .where('status', 'approved')
      .useTransaction(trx)
      .first()

    if (!membership) {
      throw new Error('Thành viên không thuộc tổ chức của project')
    }
  }

  /**
   * Load project with all necessary relations
   */
  private async loadProjectWithRelations(
    projectId: number,
    trx: TransactionClientContract
  ): Promise<Project> {
    const project = await Project.query({ client: trx })
      .where('id', projectId)
      .preload('creator')
      .preload('manager')
      .preload('organization')
      .firstOrFail()

    return project
  }
}

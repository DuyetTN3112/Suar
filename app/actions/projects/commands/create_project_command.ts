import { BaseCommand } from '#actions/shared/base_command'
import type { CreateProjectDTO } from '../dtos/create_project_dto.js'
import Project from '#models/project'
import type { DatabaseId } from '#types/database'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { OrganizationUserStatus } from '#constants/organization_constants'
import { ProjectRole } from '#constants/project_constants'
import CacheService from '#services/cache_service'
import loggerService from '#services/logger_service'
import emitter from '@adonisjs/core/services/emitter'
import ForbiddenException from '#exceptions/forbidden_exception'
import BusinessLogicException from '#exceptions/business_logic_exception'
import NotFoundException from '#exceptions/not_found_exception'

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
  async handle(dto: CreateProjectDTO): Promise<Project> {
    const user = this.getCurrentUser()

    const result = await this.executeInTransaction(async (trx) => {
      // 1. Check permission can_create_project (logic từ procedure)
      const hasPermission = await this.checkOrgPermission(
        user.id,
        dto.organization_id,
        'can_create_project',
        trx
      )

      if (!hasPermission) {
        throw new ForbiddenException('Chỉ org_admin và org_owner mới có thể tạo project')
      }

      // 2. Validate status_id exists (logic từ procedure)
      await this.validateStatusId(dto.status_id, trx)

      // 3. Validate dates (logic từ procedure)
      if (dto.start_date && dto.end_date) {
        if (dto.start_date > dto.end_date) {
          throw new BusinessLogicException('Start date không được lớn hơn end date')
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
          description: dto.description ?? null,
          organization_id: String(dto.organization_id),
          creator_id: user.id,
          owner_id: ownerId,
          manager_id: managerId ? String(managerId) : null,
          status_id: dto.status_id ? String(dto.status_id) : null,
          visibility: dto.visibility,
          start_date: dto.start_date ?? null,
          end_date: dto.end_date ?? null,
          budget: dto.budget,
        },
        { client: trx }
      )

      // 7. Add owner as project member (from trigger)
      await trx.table('project_members').insert({
        project_id: project.id,
        user_id: ownerId,
        project_role_id: ProjectRole.OWNER,
        created_at: new Date(),
      })

      // 8. Log audit trail
      await this.logAudit('create', 'project', project.id, null, project.toJSON())

      // 9. Send notification (từ procedure - outside transaction)
      this.sendProjectCreatedNotification(project, user.id)

      // 10. Load and return project with relations
      return await this.loadProjectWithRelations(project.id, trx)
    })

    // Invalidate project list caches
    await CacheService.deleteByPattern(`organization:tasks:*`)

    // Emit domain event (replaces after_project_insert trigger side-effects)
    void emitter.emit('project:created', {
      project: result,
      creatorId: this.getCurrentUser().id,
      organizationId: result.organization_id,
    })

    return result
  }

  /**
   * Validate status_id exists
   * Logic từ procedure: IF NOT EXISTS (SELECT 1 FROM project_status WHERE id = p_status_id)
   */
  private async validateStatusId(
    statusId: DatabaseId,
    trx: TransactionClientContract
  ): Promise<void> {
    const status = (await trx.from('project_status').where('id', statusId).first()) as {
      id: DatabaseId
    } | null

    if (!status) {
      throw new NotFoundException('Status ID không hợp lệ')
    }
  }

  /**
   * Send project created notification
   * Logic từ procedure: CALL create_notification(...)
   */
  private sendProjectCreatedNotification(project: Project, userId: DatabaseId): void {
    // Note: Cần inject CreateNotification action nếu muốn dùng
    // Tạm thời log để track
    loggerService.info(
      `[CreateProjectCommand] Notification: Project "${project.name}" created for user ${String(userId)}`
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
    userId: DatabaseId,
    organizationId: DatabaseId,
    trx: TransactionClientContract
  ): Promise<void> {
    const membership: unknown = await trx
      .from('organization_users')
      .where('organization_id', organizationId)
      .where('user_id', userId)
      .where('status', OrganizationUserStatus.APPROVED)
      .first()

    if (!membership) {
      throw new BusinessLogicException('Thành viên không thuộc tổ chức của project')
    }
  }

  /**
   * Load project with all necessary relations
   */
  private async loadProjectWithRelations(
    projectId: DatabaseId,
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

import db from '@adonisjs/lucid/services/db'

import {
  buildPaginationMeta,
  definePaginationPolicy,
  normalizePagination,
  toOffset,
} from '#modules/pagination/public_contracts/pagination_public_api'
import {
  type CanonicalPagePagination,
  toCanonicalPagePagination,
} from '#modules/pagination/public_contracts/pagination_public_api'
import type { SprintExternalDependencies } from '#modules/sprints/actions/ports/sprint_external_dependencies'
import type { SprintActionContext } from '#modules/sprints/actions/sprint_action_context'
import { assertCanReadProjectSprints } from '#modules/sprints/actions/support/project_sprint_access'
import { sprintExternalDeps } from '#modules/sprints/bootstrap/sprint_composition_root'
import type { ProjectSprintRecord } from '#modules/sprints/types/project_sprint_records'

const SPRINT_PAGINATION = definePaginationPolicy()

export interface ListProjectSprintsDTO {
  projectId: string
  page?: unknown
  perPage?: unknown
}

export interface ListProjectSprintsResult {
  data: ProjectSprintRecord[]
  pagination: CanonicalPagePagination
}

export default class ListProjectSprintsQuery {
  constructor(
    private readonly execCtx: SprintActionContext,
    private readonly externalDependencies: SprintExternalDependencies = sprintExternalDeps
  ) {}

  async handle(input: string | ListProjectSprintsDTO): Promise<ListProjectSprintsResult> {
    const dto = typeof input === 'string' ? { projectId: input } : input
    const access = await this.externalDependencies.projectAccess.resolveProjectSprintAccess(
      this.execCtx,
      dto.projectId
    )
    assertCanReadProjectSprints(access)
    const pagination = normalizePagination(dto, SPRINT_PAGINATION, { perPage: 10 })

    const query = db
      .from('project_sprints')
      .where('project_id', dto.projectId)
      .orderBy('starts_at', 'desc')
      .select(
        'project_sprints.*',
        db.raw(`
          (
            select count(*)::int
            from sprint_reverse_review_workflows workflow
            where workflow.sprint_id = project_sprints.id
              and workflow.status <> 'done'
          ) as reverse_review_pending_count
        `),
        db.raw(`
          (
            select count(*)::int
            from sprint_reverse_review_workflows workflow
            where workflow.sprint_id = project_sprints.id
              and workflow.target_type = 'assigner'
              and workflow.status <> 'done'
          ) as reverse_review_assigner_pending_count
        `),
        db.raw(`
          (
            select count(*)::int
            from sprint_reverse_review_workflows workflow
            where workflow.sprint_id = project_sprints.id
              and workflow.target_type = 'environment'
              and workflow.status <> 'done'
          ) as reverse_review_environment_pending_count
        `)
      )

    const totalRow = (await query
      .clone()
      .clearSelect()
      .clearOrder()
      .count('* as total')
      .first()) as { total?: string | number } | undefined
    const total = Number(totalRow?.total ?? 0)
    const data = (await query
      .offset(toOffset(pagination.page, pagination.perPage))
      .limit(pagination.perPage)) as ProjectSprintRecord[]

    return {
      data,
      pagination: toCanonicalPagePagination(buildPaginationMeta(total, pagination)),
    }
  }
}

import db from '@adonisjs/lucid/services/db'

import type {
  ReviewProjectAccessFacts,
  ReviewSprintBoardPageReader as ReviewSprintBoardPageReaderPort,
  SprintReviewWindow,
} from '#modules/reviews/actions/ports/outbound/review_sprint_board_page_reader'

interface SprintReviewWindowRow {
  id: string
  name: string
  project_id: string
  organization_id: string
  starts_at: string
  ends_at: string
  review_opened_at: string | null
}

export default class ReviewSprintBoardPageReader implements ReviewSprintBoardPageReaderPort {
  async loadProjectAccessFacts(
    projectId: string,
    actorId: string
  ): Promise<ReviewProjectAccessFacts> {
    const project = (await db
      .from('projects')
      .where('id', projectId)
      .whereNull('deleted_at')
      .select('id', 'name', 'organization_id', 'owner_id', 'manager_id', 'creator_id')
      .first()) as
      | {
          id: string
          name: string
          organization_id: string
          owner_id: string | null
          manager_id: string | null
          creator_id: string | null
        }
      | undefined

    if (!project) {
      return {
        project: null,
        isProjectMember: false,
        isOrganizationAdministrator: false,
      }
    }

    const [projectMember, organizationAdministrator] = await Promise.all([
      db
        .from('project_members')
        .where('project_id', project.id)
        .where('user_id', actorId)
        .select('id')
        .first() as Promise<unknown>,
      db
        .from('organization_users')
        .where('organization_id', project.organization_id)
        .where('user_id', actorId)
        .where('status', 'approved')
        .whereIn('org_role', ['org_owner', 'org_admin'])
        .select('id')
        .first() as Promise<unknown>,
    ])

    return {
      project: {
        id: project.id,
        name: project.name,
        organizationId: project.organization_id,
        ownerId: project.owner_id,
        managerId: project.manager_id,
        creatorId: project.creator_id,
      },
      isProjectMember: Boolean(projectMember),
      isOrganizationAdministrator: Boolean(organizationAdministrator),
    }
  }

  async loadSprintReviewWindow(input: {
    actorId: string
    organizationId: string | null
    projectId: string
    sprintId: string | null
  }): Promise<SprintReviewWindow | null> {
    const sprint = input.sprintId
      ? await this.findExplicitSprint(input.sprintId, input.projectId)
      : await this.findCurrentReviewSprint(input.actorId, input.organizationId, input.projectId)

    if (!sprint) return null

    const [activeSprint, project] = await Promise.all([
      db
        .from('project_sprints')
        .where('project_id', sprint.project_id)
        .where('status', 'active')
        .where('starts_at', '>=', sprint.ends_at)
        .orderBy('starts_at', 'asc')
        .select('id', 'name')
        .first() as Promise<{ id: string; name: string } | undefined>,
      db
        .from('projects')
        .where('id', sprint.project_id)
        .whereNull('deleted_at')
        .select('id', 'name')
        .firstOrFail() as Promise<{ id: string; name: string }>,
    ])

    return {
      sprintId: sprint.id,
      sprintName: sprint.name,
      projectId: project.id,
      projectName: project.name,
      activeSprintId: activeSprint?.id ?? null,
      activeSprintName: activeSprint?.name ?? null,
      reviewOpenedAt: sprint.review_opened_at,
    }
  }

  private async findExplicitSprint(
    sprintId: string,
    projectId: string
  ): Promise<SprintReviewWindowRow | null> {
    const sprint = (await db
      .from('project_sprints')
      .where('id', sprintId)
      .where('project_id', projectId)
      .select(
        'id',
        'name',
        'project_id',
        'organization_id',
        'starts_at',
        'ends_at',
        'review_opened_at'
      )
      .first()) as SprintReviewWindowRow | undefined

    return sprint ?? null
  }

  private async findCurrentReviewSprint(
    actorId: string,
    organizationId: string | null,
    projectId: string
  ): Promise<SprintReviewWindowRow | null> {
    let query = db
      .from('sprint_reverse_review_workflows as workflow')
      .innerJoin('project_sprints as sprint', 'sprint.id', 'workflow.sprint_id')
      .where('sprint.status', 'review_open')
      .where('sprint.project_id', projectId)
      .where((scope) => {
        void scope.where('workflow.reviewer_id', actorId).orWhere('workflow.responder_id', actorId)
      })

    if (organizationId) query = query.where('workflow.organization_id', organizationId)

    const sprint = (await query
      .groupBy(
        'sprint.id',
        'sprint.name',
        'sprint.project_id',
        'sprint.organization_id',
        'sprint.starts_at',
        'sprint.ends_at',
        'sprint.review_opened_at'
      )
      .orderByRaw("min(case when workflow.status <> 'done' then 0 else 1 end) asc")
      .orderByRaw('coalesce(sprint.review_opened_at, sprint.ends_at) desc')
      .select(
        'sprint.id',
        'sprint.name',
        'sprint.project_id',
        'sprint.organization_id',
        'sprint.starts_at',
        'sprint.ends_at',
        'sprint.review_opened_at'
      )
      .first()) as SprintReviewWindowRow | undefined

    return sprint ?? null
  }
}

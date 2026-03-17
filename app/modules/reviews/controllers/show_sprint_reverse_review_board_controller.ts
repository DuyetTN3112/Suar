import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'

import { actionContextFromHttp } from '#modules/http/public_contracts/http_execution_context'
import GetSprintReverseReviewBoardQuery from '#modules/reviews/actions/queries/get_sprint_reverse_review_board_query'
import {
  emptySprintReverseReviewBoardSection,
  type SprintReverseReviewBoard,
  type SprintReverseReviewTargetType,
} from '#modules/reviews/domain/sprint_reverse_review_workflow'

type SprintReverseReviewPageType = 'manager' | 'environment'

interface SprintReviewWindow {
  sprintId: string
  sprintName: string
  activeSprintId: string | null
  activeSprintName: string | null
  reviewOpenedAt: string | null
}

interface SprintReviewWindowRow {
  id: string
  name: string
  project_id: string
  organization_id: string
  starts_at: string
  ends_at: string
  review_opened_at: string | null
}

function normalizeReviewType(value: unknown): SprintReverseReviewPageType {
  return value === 'environment' ? 'environment' : 'manager'
}

function targetTypeForReviewType(
  reviewType: SprintReverseReviewPageType
): SprintReverseReviewTargetType {
  return reviewType === 'environment' ? 'environment' : 'assigner'
}

export default class ShowSprintReverseReviewBoardController {
  async handle(ctx: HttpContext) {
    const explicitSprintId = ctx.request.input('sprint_id') as string | undefined
    const selectedWorkflowId = ctx.request.input('workflow_id') as string | undefined
    const reviewType = normalizeReviewType(ctx.request.input('review_type'))
    const targetType = targetTypeForReviewType(reviewType)
    const actionContext = actionContextFromHttp(ctx)
    const reviewWindow = await this.resolveReviewWindow({
      actorId: actionContext.userId,
      organizationId: actionContext.organizationId,
      sprintId: explicitSprintId ?? null,
    })
    const sprintId = explicitSprintId ?? reviewWindow?.sprintId ?? null
    let board: SprintReverseReviewBoard = {
      assigner: emptySprintReverseReviewBoardSection(),
      environment: emptySprintReverseReviewBoardSection(),
    }

    if (sprintId) {
      board = await new GetSprintReverseReviewBoardQuery(actionContext).handle({
        sprint_id: sprintId,
      })
    }

    const pageName = ctx.request.url().startsWith('/org/')
      ? 'org/reviews/sprint-reverse-board'
      : 'reviews/sprint-reverse-board'

    return ctx.inertia.render(pageName, {
      sprintId: sprintId ?? null,
      reviewWindow,
      board,
      reviewType,
      targetType,
      selectedWorkflowId: selectedWorkflowId ?? null,
    })
  }

  private async resolveReviewWindow(input: {
    actorId: string
    organizationId: string | null
    sprintId: string | null
  }): Promise<SprintReviewWindow | null> {
    const sprint = input.sprintId
      ? await this.findExplicitSprint(input.sprintId)
      : await this.findCurrentReviewSprint(input.actorId, input.organizationId)

    if (!sprint) {
      return null
    }

    const activeSprint = (await db
      .from('project_sprints')
      .where('project_id', sprint.project_id)
      .where('status', 'active')
      .where('starts_at', '>=', sprint.ends_at)
      .orderBy('starts_at', 'asc')
      .select('id', 'name')
      .first()) as { id: string; name: string } | undefined

    return {
      sprintId: sprint.id,
      sprintName: sprint.name,
      activeSprintId: activeSprint?.id ?? null,
      activeSprintName: activeSprint?.name ?? null,
      reviewOpenedAt: sprint.review_opened_at,
    }
  }

  private async findExplicitSprint(sprintId: string): Promise<SprintReviewWindowRow | null> {
    const sprint = (await db
      .from('project_sprints')
      .where('id', sprintId)
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
    organizationId: string | null
  ): Promise<SprintReviewWindowRow | null> {
    let query = db
      .from('sprint_reverse_review_workflows as workflow')
      .innerJoin('project_sprints as sprint', 'sprint.id', 'workflow.sprint_id')
      .where('sprint.status', 'review_open')
      .where((scope) => {
        void scope.where('workflow.reviewer_id', actorId).orWhere('workflow.responder_id', actorId)
      })

    if (organizationId) {
      query = query.where('workflow.organization_id', organizationId)
    }

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

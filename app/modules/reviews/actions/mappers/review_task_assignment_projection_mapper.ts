import type {
  MissingReviewTaskAssignmentProjection,
  ReviewTaskAssignmentDetailProjection,
  ReviewTaskAssignmentProjection,
  ReviewTaskAssignmentSummaryProjection,
} from '#modules/reviews/actions/dtos/response/review_session_projection'

/** Projection detail requested by the owning Review query. */
export type ReviewTaskAssignmentProjectionLevel = 'summary' | 'detail'

export interface ReviewTaskAssignmentProjectionFact {
  id: string
  taskId: string
  assigneeId: string
  assignmentStatus: 'active' | 'completed' | 'cancelled'
  estimatedHours: number | null
  actualHours: number | null
  completionNotes: string | null
  task: {
    id: string
    title: string
    description: string
    status: string
    priority: string
    difficulty: string | null
    dueDate: string | null
  }
}

function missingAssignmentProjection(
  assignmentId: string
): MissingReviewTaskAssignmentProjection {
  return {
    id: assignmentId,
    task_id: null,
    task: null,
    unavailable: true,
  }
}

function summaryAssignmentProjection(
  fact: ReviewTaskAssignmentProjectionFact
): ReviewTaskAssignmentSummaryProjection {
  return {
    id: fact.id,
    task_id: fact.taskId,
    task: {
      id: fact.task.id,
      title: fact.task.title,
    },
  }
}

function detailAssignmentProjection(
  fact: ReviewTaskAssignmentProjectionFact
): ReviewTaskAssignmentDetailProjection {
  return {
    id: fact.id,
    task_id: fact.taskId,
    assignee_id: fact.assigneeId,
    assignment_status: fact.assignmentStatus,
    estimated_hours: fact.estimatedHours,
    actual_hours: fact.actualHours,
    completion_notes: fact.completionNotes,
    task: {
      id: fact.task.id,
      title: fact.task.title,
      description: fact.task.description,
      status: fact.task.status,
      priority: fact.task.priority,
      difficulty: fact.task.difficulty,
      due_date: fact.task.dueDate,
    },
  }
}

export function buildReviewTaskAssignmentProjectionMap(
  assignmentIds: string[],
  facts: ReviewTaskAssignmentProjectionFact[],
  level: ReviewTaskAssignmentProjectionLevel
): Map<string, ReviewTaskAssignmentProjection> {
  const uniqueAssignmentIds = [...new Set(assignmentIds)]
  const factsById = new Map(facts.map((fact) => [fact.id, fact]))

  return new Map<string, ReviewTaskAssignmentProjection>(
    uniqueAssignmentIds.map<[string, ReviewTaskAssignmentProjection]>((assignmentId) => {
      const fact = factsById.get(assignmentId)
      if (!fact) {
        return [assignmentId, missingAssignmentProjection(assignmentId)]
      }

      return [
        assignmentId,
        level === 'detail'
          ? detailAssignmentProjection(fact)
          : summaryAssignmentProjection(fact),
      ]
    })
  )
}

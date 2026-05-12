import { LucidSprintTransactionRunner } from '#composition/adapters/sprints/lucid_sprint_transaction_runner'
import { ProjectSprintAccessReaderAdapter } from '#composition/adapters/projects/project_sprint_access_reader_adapter'

import { ComposedSprintCommandFactory } from '#composition/sprints/project-sprint/factories/sprint_command_factory'
import { ComposedSprintQueryFactory } from '#composition/sprints/project-sprint/factories/sprint_query_factory'
import { reviewActionFactory } from '#composition/reviews/review-core/review_action_factory'
import { SprintReviewClosure } from '#modules/sprints/actions/ports/outbound/sprint_review_closure'
import { PostgresSprintRepository } from '#modules/sprints/infra/repositories/project-sprint/postgres_sprint_repository'
import { PostgresProjectBacklogReader } from '#modules/sprints/infra/repositories/read/project-backlog/postgres_project_backlog_reader'
import { PostgresSprintBoardReader } from '#modules/sprints/infra/repositories/read/sprint-board/postgres_sprint_board_reader'

const sprintDependencies = {
  projectAccess: new ProjectSprintAccessReaderAdapter(),
}
const sprintRepository = new PostgresSprintRepository()
const sprintTransactions = new LucidSprintTransactionRunner()

class ComposedSprintReviewClosure extends SprintReviewClosure {
  async close(context: Parameters<typeof reviewActionFactory.makeCloseProjectSprintReviewCommand>[0], input: { sprint_id: string; project_id: string }) {
    return reviewActionFactory
      .makeCloseProjectSprintReviewCommand(context)
      .executeAndWrap(input)
  }
}

export const sprintReviewClosure = new ComposedSprintReviewClosure()

export const sprintCommandFactory = new ComposedSprintCommandFactory(
  sprintDependencies,
  sprintRepository,
  sprintTransactions,
  sprintReviewClosure
)
export const sprintQueryFactory = new ComposedSprintQueryFactory(
  sprintDependencies,
  new PostgresSprintBoardReader(),
  new PostgresProjectBacklogReader(),
  sprintRepository
)

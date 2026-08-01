import { LucidSprintTransactionRunner } from './adapters/lucid_sprint_transaction_runner.js'
import { ProjectSprintAccessReaderAdapter } from './adapters/project_sprint_access_reader_adapter.js'

import { ComposedSprintCommandFactory } from '#composition/factories/sprint_command_factory'
import { ComposedSprintQueryFactory } from '#composition/factories/sprint_query_factory'
import { PostgresSprintRepository } from '#modules/sprints/infra/repositories/postgres_sprint_repository'
import { PostgresSprintBoardReader } from '#modules/sprints/infra/repositories/read/postgres_sprint_board_reader'

const sprintDependencies = {
  projectAccess: new ProjectSprintAccessReaderAdapter(),
}
const sprintRepository = new PostgresSprintRepository()
const sprintTransactions = new LucidSprintTransactionRunner()

export const sprintCommandFactory = new ComposedSprintCommandFactory(
  sprintDependencies,
  sprintRepository,
  sprintTransactions
)
export const sprintQueryFactory = new ComposedSprintQueryFactory(
  sprintDependencies,
  new PostgresSprintBoardReader(),
  sprintRepository
)

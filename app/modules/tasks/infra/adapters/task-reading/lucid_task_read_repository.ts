import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import type {
  TaskReadRepository,
  TaskRecordPage,
} from '#modules/tasks/actions/ports/outbound/task_read_repository'
import type { TaskTransaction } from '#modules/tasks/actions/ports/outbound/task_transaction'
import { TaskInfraMapper } from '#modules/tasks/infra/adapters/task-authoring/task_infra_mapper'
import * as listQueries from '#modules/tasks/infra/repositories/task-reading/read/list_queries'
import * as statisticsQueries from '#modules/tasks/infra/repositories/task-reading/read/statistics_queries'

function lucidTransaction(transaction?: TaskTransaction): TransactionClientContract | undefined {
  return transaction as TransactionClientContract | undefined
}

export class LucidTaskReadRepository implements TaskReadRepository {
  async paginateByOrganization(
    organizationId: Parameters<TaskReadRepository['paginateByOrganization']>[0],
    filters: Parameters<TaskReadRepository['paginateByOrganization']>[1],
    permissionFilter: Parameters<TaskReadRepository['paginateByOrganization']>[2],
    transaction?: TaskTransaction
  ): Promise<TaskRecordPage> {
    const paginator = await listQueries.paginateByOrganization(
      organizationId,
      filters,
      permissionFilter,
      lucidTransaction(transaction)
    )

    return {
      data: paginator.all().map((task) => TaskInfraMapper.toDetailRecord(task)),
      meta: {
        total: paginator.total,
        per_page: paginator.perPage,
        current_page: paginator.currentPage,
        last_page: paginator.lastPage,
        first_page: paginator.firstPage,
        next_page_url: paginator.getNextPageUrl(),
        previous_page_url: paginator.getPreviousPageUrl(),
      },
    }
  }

  getListStatsByOrganization(
    organizationId: Parameters<TaskReadRepository['getListStatsByOrganization']>[0],
    permissionFilter: Parameters<TaskReadRepository['getListStatsByOrganization']>[1],
    transaction?: TaskTransaction
  ) {
    return listQueries.getListStatsByOrganization(
      organizationId,
      permissionFilter,
      lucidTransaction(transaction)
    )
  }

  findRootTasksForKanban(
    organizationId: Parameters<TaskReadRepository['findRootTasksForKanban']>[0],
    permissionFilter: Parameters<TaskReadRepository['findRootTasksForKanban']>[1],
    transaction?: TaskTransaction
  ) {
    return listQueries.findRootTasksForKanbanAsRecords(
      organizationId,
      permissionFilter,
      lucidTransaction(transaction)
    )
  }

  findTasksForTimeline(
    organizationId: Parameters<TaskReadRepository['findTasksForTimeline']>[0],
    permissionFilter: Parameters<TaskReadRepository['findTasksForTimeline']>[1],
    transaction?: TaskTransaction
  ) {
    return listQueries.findTasksForTimelineAsRecords(
      organizationId,
      permissionFilter,
      lucidTransaction(transaction)
    )
  }

  paginateByUser(
    options: Parameters<TaskReadRepository['paginateByUser']>[0],
    transaction?: TaskTransaction
  ) {
    return listQueries.paginateByUserAsRecords(options, lucidTransaction(transaction))
  }

  async findRootTaskOptions(
    organizationId: Parameters<TaskReadRepository['findRootTaskOptions']>[0],
    limit?: number,
    transaction?: TaskTransaction
  ) {
    const tasks = await listQueries.findRootTasksByOrganization(
      organizationId,
      limit,
      lucidTransaction(transaction)
    )
    return tasks.map((task) => ({
      id: task.id,
      title: task.title,
      task_status_id: task.task_status_id,
    }))
  }

  getStatisticsByOrganization(
    organizationId: Parameters<TaskReadRepository['getStatisticsByOrganization']>[0],
    permissionFilter: Parameters<TaskReadRepository['getStatisticsByOrganization']>[1],
    transaction?: TaskTransaction
  ) {
    return statisticsQueries.getStatisticsByOrganization(
      organizationId,
      permissionFilter,
      lucidTransaction(transaction)
    )
  }
}

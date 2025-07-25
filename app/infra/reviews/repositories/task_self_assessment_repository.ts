import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import * as taskSelfAssessmentQueries from './read/task_self_assessment_queries.js'
import * as taskSelfAssessmentMutations from './write/task_self_assessment_mutations.js'

import type TaskSelfAssessment from '#infra/tasks/models/task_self_assessment'
import type { DatabaseId } from '#types/database'

export default class TaskSelfAssessmentRepository {
  private readonly __instanceMarker = true

  static {
    void new TaskSelfAssessmentRepository().__instanceMarker
  }

  static async findByTaskAssignmentAndUser(
    taskAssignmentId: DatabaseId,
    userId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<TaskSelfAssessment | null> {
    return taskSelfAssessmentQueries.findByTaskAssignmentAndUser(taskAssignmentId, userId, trx)
  }

  static async create(
    data: Partial<TaskSelfAssessment>,
    trx?: TransactionClientContract
  ): Promise<TaskSelfAssessment> {
    return taskSelfAssessmentMutations.create(data, trx)
  }

  static async save(
    assessment: TaskSelfAssessment,
    trx?: TransactionClientContract
  ): Promise<TaskSelfAssessment> {
    return taskSelfAssessmentMutations.save(assessment, trx)
  }
}

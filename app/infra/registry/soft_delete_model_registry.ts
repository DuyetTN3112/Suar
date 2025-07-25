import type { LucidModel } from '@adonisjs/lucid/types/model'

import Organization from '#infra/organizations/models/organization'
import Project from '#infra/projects/models/project'
import Task from '#infra/tasks/models/task'
import User from '#infra/users/models/user'

const softDeleteModels: Record<string, LucidModel> = {
  organization: Organization,
  project: Project,
  task: Task,
  user: User,
}

export function resolveModelForSoftDelete(modelName: string): LucidModel {
  const model = softDeleteModels[modelName]
  if (!model) {
    throw new Error(`SoftDeleteMiddleware: model '${modelName}' not registered`)
  }
  return model
}

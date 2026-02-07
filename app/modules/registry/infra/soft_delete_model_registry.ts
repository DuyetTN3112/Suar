import type { LucidModel } from '@adonisjs/lucid/types/model'

import Organization from '#modules/organizations/infra/models/organization'
import Project from '#modules/projects/infra/models/project'
import Task from '#modules/tasks/infra/models/task'
import User from '#modules/users/infra/models/user'

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

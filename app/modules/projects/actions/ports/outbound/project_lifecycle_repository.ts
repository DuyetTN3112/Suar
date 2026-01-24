import type { ProjectTransaction } from './project_transaction.js'

import type { ProjectRecord } from '#modules/projects/types/project_records'

export abstract class ProjectLifecycleRepository {
  abstract findDetail(
    projectId: string,
    transaction?: ProjectTransaction
  ): Promise<ProjectRecord>
  abstract findForUpdate(
    projectId: string,
    transaction: ProjectTransaction
  ): Promise<ProjectRecord>
  abstract create(
    data: Record<string, unknown>,
    transaction: ProjectTransaction
  ): Promise<ProjectRecord>
  abstract update(
    projectId: string,
    data: Record<string, unknown>,
    transaction: ProjectTransaction
  ): Promise<ProjectRecord>
  abstract updateOwner(
    projectId: string,
    ownerId: string,
    transaction: ProjectTransaction
  ): Promise<ProjectRecord>
  abstract softDelete(
    projectId: string,
    transaction: ProjectTransaction
  ): Promise<ProjectRecord>
  abstract hardDelete(
    projectId: string,
    transaction: ProjectTransaction
  ): Promise<ProjectRecord>
}

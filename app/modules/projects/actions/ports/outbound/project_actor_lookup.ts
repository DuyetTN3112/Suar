import type { ProjectTransaction } from './project_transaction.js'

export interface ProjectActor {
  id: string
  username: string | null
  email: string | null
}

export interface ProjectActorLookup {
  findProjectActor(userId: string, transaction?: ProjectTransaction): Promise<ProjectActor | null>
}

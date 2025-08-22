import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

export interface ProjectActor {
  id: string
  username: string | null
  email: string | null
  systemRole: string | null
}

export interface ProjectActorLookup {
  findProjectActor(userId: string, trx?: TransactionClientContract): Promise<ProjectActor | null>
}

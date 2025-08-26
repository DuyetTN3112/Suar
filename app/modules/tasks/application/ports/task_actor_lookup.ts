export interface TaskActor {
  id: string
  username: string | null
  email: string | null
  systemRole: string | null
}

export interface TaskActorLookup {
  findTaskActor(userId: string): Promise<TaskActor | null>
}

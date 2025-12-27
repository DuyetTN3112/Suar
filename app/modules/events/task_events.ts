export class TaskCreatedEvent {
  public eventName = 'task.created'
  public taskId: string
  public title: string
  public creatorId: string
  public organizationId: string

  constructor(payload: { taskId: string; title: string; creatorId: string; organizationId: string }) {
    if (!payload.taskId) {
      throw new Error('taskId is required')
    }
    this.taskId = payload.taskId
    this.title = payload.title
    this.creatorId = payload.creatorId
    this.organizationId = payload.organizationId
  }
}

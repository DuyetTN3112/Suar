import { randomUUID } from 'node:crypto'

type TaskApplicationProps = {
  id: string
  taskId: string
  projectId: string
  applicantId: string
  status: 'pending' | 'approved' | 'rejected'
  appliedAt: Date
  message?: string
  evidenceLinks?: string[]
}

export class TaskApplication {
  public readonly id: string
  public readonly taskId: string
  public readonly projectId: string
  public readonly applicantId: string
  public status: 'pending' | 'approved' | 'rejected' | 'withdrawn'
  public message?: string
  public evidenceLinks?: string[]
  public readonly appliedAt: Date

  private constructor(props: TaskApplicationProps) {
    this.id = props.id
    this.taskId = props.taskId
    this.projectId = props.projectId
    this.applicantId = props.applicantId
    this.status = props.status
    this.appliedAt = props.appliedAt
    if (props.message !== undefined) {
      this.message = props.message
    }
    if (props.evidenceLinks !== undefined) {
      this.evidenceLinks = props.evidenceLinks
    }
  }

  public static create(props: {
    taskId: string
    projectId: string
    applicantId: string
    message?: string
    evidenceLinks?: string[]
  }): TaskApplication {
    const applicationProps: TaskApplicationProps = {
      id: randomUUID(),
      taskId: props.taskId,
      projectId: props.projectId,
      applicantId: props.applicantId,
      status: 'pending',
      appliedAt: new Date(),
    }

    if (props.message !== undefined) {
      applicationProps.message = props.message
    }
    if (props.evidenceLinks !== undefined) {
      applicationProps.evidenceLinks = props.evidenceLinks
    }

    return new TaskApplication(applicationProps)
  }

  public approve(): void {
    if (this.status !== 'pending') {
      throw new Error('Can only approve pending applications')
    }
    this.status = 'approved'
  }

  public reject(): void {
    if (this.status !== 'pending') {
      throw new Error('Can only reject pending applications')
    }
    this.status = 'rejected'
  }
}

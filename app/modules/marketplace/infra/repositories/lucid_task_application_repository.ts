import db from '@adonisjs/lucid/services/db'

import type { TaskApplicationRepository } from '../../application/ports/task_application_repository.js'
import { TaskApplication } from '../../domain/task_application.js'

interface TaskApplicationRow {
  id: string
  task_id: string
  project_id: string
  applicant_id: string
  application_status: 'pending' | 'approved' | 'rejected' | 'withdrawn'
  message: string | null
  portfolio_links: string[] | string | null
  applied_at: Date | string
}

export class LucidTaskApplicationRepository implements TaskApplicationRepository {
  public async save(application: TaskApplication): Promise<void> {
    const existing: unknown = await db.from('task_applications').where('id', application.id).first()

    if (existing) {
      await db
        .from('task_applications')
        .where('id', application.id)
        .update({
          application_status: application.status,
          message: application.message ?? null,
          portfolio_links: application.evidenceLinks ? JSON.stringify(application.evidenceLinks) : null,
        })
    } else {
      await db.table('task_applications').insert({
        id: application.id,
        task_id: application.taskId,
        applicant_id: application.applicantId,
        application_status: application.status,
        application_source: 'public_listing',
        message: application.message ?? null,
        portfolio_links: application.evidenceLinks ? JSON.stringify(application.evidenceLinks) : null,
        applied_at: application.appliedAt,
      })
    }
  }

  public async findById(id: string): Promise<TaskApplication | null> {
    const record = (await this.baseQuery().where('ta.id', id).first()) as TaskApplicationRow | null
    return record ? this.toDomain(record) : null
  }

  public async findByTaskId(taskId: string): Promise<TaskApplication[]> {
    const records = (await this.baseQuery().where('ta.task_id', taskId)) as TaskApplicationRow[]
    return records.map(r => this.toDomain(r))
  }

  public async findByTaskAndApplicant(taskId: string, applicantId: string): Promise<TaskApplication | null> {
    const record = (await this.baseQuery()
      .where('ta.task_id', taskId)
      .where('ta.applicant_id', applicantId)
      .first()) as TaskApplicationRow | null
    return record ? this.toDomain(record) : null
  }

  private baseQuery() {
    return db
      .from('task_applications as ta')
      .join('tasks as t', 't.id', 'ta.task_id')
      .select(
        'ta.id',
        'ta.task_id',
        't.project_id',
        'ta.applicant_id',
        'ta.application_status',
        'ta.message',
        'ta.portfolio_links',
        'ta.applied_at'
      )
  }

  // Normally we would use a factory or private constructor to re-hydrate the domain entity
  private toDomain(record: TaskApplicationRow): TaskApplication {
    // For simplicity, we can use any casting to bypass private constructor, 
    // or we can add a reconstruct method to TaskApplication in a real system.
    const app = Object.create(TaskApplication.prototype) as TaskApplication
    const portfolioLinks = Array.isArray(record.portfolio_links)
      ? record.portfolio_links
      : typeof record.portfolio_links === 'string'
        ? (JSON.parse(record.portfolio_links) as unknown[])
            .filter((item): item is string => typeof item === 'string')
        : undefined

    Object.assign(app, {
      id: record.id,
      taskId: record.task_id,
      projectId: record.project_id,
      applicantId: record.applicant_id,
      status: record.application_status,
      message: record.message,
      evidenceLinks: portfolioLinks,
      appliedAt: new Date(record.applied_at),
    })
    return app
  }
}

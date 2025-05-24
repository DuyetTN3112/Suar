/**
 * DTO cho việc lấy chi tiết một task
 *
 * Validates:
 * - task_id: ID của task, bắt buộc
 * - include_versions: Load version history không (default: true)
 * - include_child_tasks: Load subtasks không (default: true)
 * - include_audit_logs: Load audit logs không (default: true)
 * - audit_logs_limit: Số lượng audit logs (default: 20, max: 100)
 *
 * Provides:
 * - Control over which relations to load
 * - Performance optimization options
 */
export default class GetTaskDetailDTO {
  public readonly task_id: number
  public readonly include_versions: boolean
  public readonly include_child_tasks: boolean
  public readonly include_audit_logs: boolean
  public readonly audit_logs_limit: number

  constructor(data: {
    task_id: number
    include_versions?: boolean
    include_child_tasks?: boolean
    include_audit_logs?: boolean
    audit_logs_limit?: number
  }) {
    // Validate task_id
    if (!data.task_id || data.task_id <= 0) {
      throw new Error('ID task là bắt buộc')
    }

    // Validate audit_logs_limit if provided
    let auditLogsLimit = data.audit_logs_limit ?? 20

    if (auditLogsLimit < 1) {
      throw new Error('Số lượng audit logs phải lớn hơn 0')
    }

    if (auditLogsLimit > 100) {
      throw new Error('Số lượng audit logs không được vượt quá 100')
    }

    this.task_id = data.task_id
    this.include_versions = data.include_versions ?? true
    this.include_child_tasks = data.include_child_tasks ?? true
    this.include_audit_logs = data.include_audit_logs ?? true
    this.audit_logs_limit = auditLogsLimit
  }

  /**
   * Kiểm tra xem có load versions không
   */
  public shouldLoadVersions(): boolean {
    return this.include_versions === true
  }

  /**
   * Kiểm tra xem có load child tasks không
   */
  public shouldLoadChildTasks(): boolean {
    return this.include_child_tasks === true
  }

  /**
   * Kiểm tra xem có load audit logs không
   */
  public shouldLoadAuditLogs(): boolean {
    return this.include_audit_logs === true
  }

  /**
   * Kiểm tra xem có load minimal data không (không load relations phụ)
   */
  public isMinimalLoad(): boolean {
    return !this.include_versions && !this.include_child_tasks && !this.include_audit_logs
  }

  /**
   * Lấy cache key cho query này
   */
  public getCacheKey(): string {
    const parts: string[] = [`task:detail:${this.task_id}`]

    if (!this.include_versions) {
      parts.push('no-versions')
    }

    if (!this.include_child_tasks) {
      parts.push('no-children')
    }

    if (!this.include_audit_logs) {
      parts.push('no-audit')
    } else if (this.audit_logs_limit !== 20) {
      parts.push(`audit-limit:${this.audit_logs_limit}`)
    }

    return parts.join(':')
  }

  /**
   * Convert DTO thành object để log hoặc debug
   */
  public toObject(): Record<string, any> {
    return {
      task_id: this.task_id,
      include_versions: this.include_versions,
      include_child_tasks: this.include_child_tasks,
      include_audit_logs: this.include_audit_logs,
      audit_logs_limit: this.audit_logs_limit,
      is_minimal_load: this.isMinimalLoad(),
    }
  }

  /**
   * Lấy danh sách relations cần preload
   */
  public getRelationsToLoad(): string[] {
    const relations = [
      'status',
      'label',
      'priority',
      'assignee',
      'creator',
      'updater',
      'organization',
      'project',
      'parentTask',
    ]

    if (this.shouldLoadChildTasks()) {
      relations.push('childTasks')
    }

    if (this.shouldLoadVersions()) {
      relations.push('versions')
    }

    return relations
  }

  /**
   * Tạo DTO với minimal load (cho API endpoints cần performance)
   */
  public static createMinimal(task_id: number): GetTaskDetailDTO {
    return new GetTaskDetailDTO({
      task_id,
      include_versions: false,
      include_child_tasks: false,
      include_audit_logs: false,
    })
  }

  /**
   * Tạo DTO với full load (cho detail page)
   */
  public static createFull(task_id: number): GetTaskDetailDTO {
    return new GetTaskDetailDTO({
      task_id,
      include_versions: true,
      include_child_tasks: true,
      include_audit_logs: true,
      audit_logs_limit: 50,
    })
  }
}

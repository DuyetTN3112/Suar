export interface AdminAuditLogInvestigation {
  readonly isStructured: boolean
  readonly eventName: string | null
  readonly eventFamily: string | null
  readonly module: string | null
  readonly subsystem: string | null
  readonly workflow: string | null
  readonly stage: string | null
  readonly severity: string | null
  readonly outcome: string | null
  readonly traceId: string | null
  readonly correlationKey: string | null
  readonly frontendSubmissionId: string | null
  readonly requestId: string | null
  readonly initiatorType: string | null
  readonly actorUserId: string | null
  readonly actorOrganizationId: string | null
  readonly targetType: string | null
  readonly targetId: string | null
  readonly targetScope: string | null
  readonly retentionClass: string | null
  readonly durationMs: number | null
  readonly errorClass: string | null
  readonly errorMessage: string | null
  readonly summary: string
}

export interface AdminAuditLogItem {
  readonly id: string
  readonly user: {
    readonly id: string
    readonly username: string
  } | null
  readonly action: string
  readonly resourceType: string
  readonly resourceId: string | null
  readonly details: {
    readonly oldValues: Record<string, unknown>
    readonly newValues: Record<string, unknown>
  }
  readonly ipAddress: string
  readonly userAgent: string
  readonly createdAt: string
  readonly investigation: AdminAuditLogInvestigation
}

export interface AdminAuditLogConsoleFilters {
  readonly severity: string
  readonly module: string
  readonly workflow: string
  readonly outcome: string
}

export interface AdminAuditLogConsoleRow extends AdminAuditLogItem {
  readonly actorLabel: string
  readonly severityLabel: string
  readonly moduleLabel: string
  readonly workflowLabel: string
  readonly outcomeLabel: string
  readonly targetLabel: string
  readonly requestLabel: string
  readonly detailPairs: Array<{ readonly label: string; readonly value: string }>
}

export interface AdminAuditLogTraceTimelineEntry {
  readonly id: string
  readonly summary: string
  readonly stage: string | null
  readonly outcomeLabel: string
  readonly severityLabel: string
  readonly workflowLabel: string
  readonly moduleLabel: string
  readonly createdAt: string
  readonly requestLabel: string
}

interface RankedSignal {
  readonly label: string
  readonly count: number
}

interface SlowEventSignal {
  readonly id: string
  readonly summary: string
  readonly durationMs: number
  readonly workflowLabel: string
  readonly moduleLabel: string
}

function titleizeToken(value: string): string {
  return value
    .split(/[_\-.]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function buildTargetLabel(log: AdminAuditLogItem): string {
  const targetType = log.investigation.targetType ?? log.resourceType
  const targetId = log.investigation.targetId ?? log.resourceId

  if (!targetType) {
    return 'Unknown target'
  }

  const label = titleizeToken(targetType)

  if (!targetId) {
    return label
  }

  return `${label} #${targetId}`
}

function buildDetailPairs(log: AdminAuditLogItem): Array<{ readonly label: string; readonly value: string }> {
  return [
    { label: 'Action', value: log.action },
    { label: 'Entity', value: log.resourceType },
    { label: 'Resource ID', value: log.resourceId ?? 'N/A' },
    { label: 'Trace', value: log.investigation.traceId ?? 'N/A' },
    { label: 'Request', value: log.investigation.requestId ?? 'N/A' },
    { label: 'IP', value: log.ipAddress || 'N/A' },
    { label: 'Agent', value: log.userAgent || 'N/A' },
    { label: 'Retention', value: log.investigation.retentionClass ?? 'N/A' },
  ]
}

export function buildAdminAuditLogConsoleModel(
  logs: AdminAuditLogItem[],
  filters: AdminAuditLogConsoleFilters
) {
  const rows: AdminAuditLogConsoleRow[] = logs.map((log) => ({
    ...log,
    actorLabel:
      log.user?.username ??
      log.investigation.actorUserId ??
      log.investigation.initiatorType ??
      'System',
    severityLabel: log.investigation.severity ? titleizeToken(log.investigation.severity) : 'Audit',
    moduleLabel: log.investigation.module ? titleizeToken(log.investigation.module) : 'Legacy',
    workflowLabel: log.investigation.workflow ? titleizeToken(log.investigation.workflow) : 'Legacy Flow',
    outcomeLabel: log.investigation.outcome ? titleizeToken(log.investigation.outcome) : 'Recorded',
    targetLabel: buildTargetLabel(log),
    requestLabel: log.investigation.requestId ?? log.ipAddress,
    detailPairs: buildDetailPairs(log),
  }))

  const filteredRows = rows.filter((log) => {
    if (filters.severity && log.investigation.severity !== filters.severity) {
      return false
    }
    if (filters.module && log.investigation.module !== filters.module) {
      return false
    }
    if (filters.workflow && log.investigation.workflow !== filters.workflow) {
      return false
    }
    if (filters.outcome && log.investigation.outcome !== filters.outcome) {
      return false
    }
    return true
  })

  const modules = Array.from(
    new Set(rows.map((log) => log.investigation.module).filter((value): value is string => Boolean(value)))
  )
  const workflows = Array.from(
    new Set(rows.map((log) => log.investigation.workflow).filter((value): value is string => Boolean(value)))
  )
  const severities = Array.from(
    new Set(rows.map((log) => log.investigation.severity).filter((value): value is string => Boolean(value)))
  )
  const outcomes = Array.from(
    new Set(rows.map((log) => log.investigation.outcome).filter((value): value is string => Boolean(value)))
  )

  const failedCount = filteredRows.filter((log) => log.investigation.outcome === 'failure').length
  const warningCount = filteredRows.filter((log) => log.investigation.severity === 'warn').length
  const structuredCount = filteredRows.filter((log) => log.investigation.isStructured).length
  const uniqueTraceCount = new Set(
    filteredRows.map((log) => log.investigation.traceId).filter((value): value is string => Boolean(value))
  ).size

  const topModules = Array.from(
    filteredRows.reduce((acc, log) => {
      const key = log.moduleLabel
      acc.set(key, (acc.get(key) ?? 0) + 1)
      return acc
    }, new Map<string, number>())
  )
    .sort((left, right) => right[1] - left[1])
    .slice(0, 4)
    .map(([label, count]) => ({ label, count }))

  const topActors = Array.from(
    filteredRows.reduce((acc, log) => {
      acc.set(log.actorLabel, (acc.get(log.actorLabel) ?? 0) + 1)
      return acc
    }, new Map<string, number>())
  )
    .sort((left, right) => right[1] - left[1])
    .slice(0, 4)
    .map(([label, count]) => ({ label, count }))

  const failingWorkflows: RankedSignal[] = Array.from(
    filteredRows.reduce((acc, log) => {
      if (log.investigation.outcome !== 'failure') {
        return acc
      }

      acc.set(log.workflowLabel, (acc.get(log.workflowLabel) ?? 0) + 1)
      return acc
    }, new Map<string, number>())
  )
    .sort((left, right) => right[1] - left[1])
    .slice(0, 4)
    .map(([label, count]) => ({ label, count }))

  const traceHotspots: RankedSignal[] = Array.from(
    filteredRows.reduce((acc, log) => {
      const key = log.investigation.traceId
      if (!key) {
        return acc
      }

      acc.set(key, (acc.get(key) ?? 0) + 1)
      return acc
    }, new Map<string, number>())
  )
    .sort((left, right) => right[1] - left[1])
    .slice(0, 4)
    .map(([label, count]) => ({ label, count }))

  const slowestEvents: SlowEventSignal[] = filteredRows
    .filter((log) => typeof log.investigation.durationMs === 'number')
    .sort(
      (left, right) =>
        (right.investigation.durationMs ?? Number.NEGATIVE_INFINITY) -
        (left.investigation.durationMs ?? Number.NEGATIVE_INFINITY)
    )
    .slice(0, 4)
    .map((log) => ({
      id: log.id,
      summary: log.investigation.summary,
      durationMs: log.investigation.durationMs ?? 0,
      workflowLabel: log.workflowLabel,
      moduleLabel: log.moduleLabel,
    }))

  return {
    rows,
    filteredRows,
    modules,
    workflows,
    severities,
    outcomes,
    summary: {
      total: filteredRows.length,
      failedCount,
      warningCount,
      structuredCount,
      uniqueTraceCount,
    },
    topModules,
    topActors,
    failingWorkflows,
    traceHotspots,
    slowestEvents,
  }
}

export function buildAdminAuditLogTraceTimeline(
  rows: AdminAuditLogConsoleRow[],
  selectedLog: AdminAuditLogConsoleRow | null
): AdminAuditLogTraceTimelineEntry[] {
  const traceId = selectedLog?.investigation.traceId

  if (!traceId) {
    return []
  }

  return rows
    .filter((row) => row.investigation.traceId === traceId)
    .sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime())
    .map((row) => ({
      id: row.id,
      summary: row.investigation.summary,
      stage: row.investigation.stage,
      outcomeLabel: row.outcomeLabel,
      severityLabel: row.severityLabel,
      workflowLabel: row.workflowLabel,
      moduleLabel: row.moduleLabel,
      createdAt: row.createdAt,
      requestLabel: row.requestLabel,
    }))
}

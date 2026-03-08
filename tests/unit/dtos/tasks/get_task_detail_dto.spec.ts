import { test } from '@japa/runner'
import GetTaskDetailDTO from '#actions/tasks/dtos/get_task_detail_dto'

const VALID_UUID = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'

// ============================================================================
// GetTaskDetailDTO - Construction
// ============================================================================
test.group('GetTaskDetailDTO | Construction', () => {
  test('creates with defaults (all includes true)', ({ assert }) => {
    const dto = new GetTaskDetailDTO({ task_id: VALID_UUID })
    assert.isTrue(dto.include_versions)
    assert.isTrue(dto.include_child_tasks)
    assert.isTrue(dto.include_audit_logs)
  })

  test('creates with custom includes', ({ assert }) => {
    const dto = new GetTaskDetailDTO({
      task_id: VALID_UUID,
      include_versions: false,
      include_child_tasks: false,
      include_audit_logs: false,
    })
    assert.isFalse(dto.include_versions)
    assert.isFalse(dto.include_child_tasks)
    assert.isFalse(dto.include_audit_logs)
  })

  test('creates with custom audit_logs_limit', ({ assert }) => {
    const dto = new GetTaskDetailDTO({ task_id: VALID_UUID, audit_logs_limit: 50 })
    assert.equal(dto.audit_logs_limit, 50)
  })

  test('throws for missing task_id', ({ assert }) => {
    assert.throws(() => new GetTaskDetailDTO({ task_id: '' }))
  })

  test('throws for audit_logs_limit < 1', ({ assert }) => {
    assert.throws(() => new GetTaskDetailDTO({ task_id: VALID_UUID, audit_logs_limit: 0 }))
  })

  test('throws for audit_logs_limit > 100', ({ assert }) => {
    assert.throws(() => new GetTaskDetailDTO({ task_id: VALID_UUID, audit_logs_limit: 101 }))
  })
})

// ============================================================================
// GetTaskDetailDTO - Load Control
// ============================================================================
test.group('GetTaskDetailDTO | Load Control', () => {
  test('shouldLoadVersions reflects include_versions', ({ assert }) => {
    assert.isTrue(new GetTaskDetailDTO({ task_id: VALID_UUID }).shouldLoadVersions())
    assert.isFalse(
      new GetTaskDetailDTO({ task_id: VALID_UUID, include_versions: false }).shouldLoadVersions()
    )
  })

  test('shouldLoadChildTasks reflects include_child_tasks', ({ assert }) => {
    assert.isTrue(new GetTaskDetailDTO({ task_id: VALID_UUID }).shouldLoadChildTasks())
    assert.isFalse(
      new GetTaskDetailDTO({
        task_id: VALID_UUID,
        include_child_tasks: false,
      }).shouldLoadChildTasks()
    )
  })

  test('shouldLoadAuditLogs reflects include_audit_logs', ({ assert }) => {
    assert.isTrue(new GetTaskDetailDTO({ task_id: VALID_UUID }).shouldLoadAuditLogs())
    assert.isFalse(
      new GetTaskDetailDTO({
        task_id: VALID_UUID,
        include_audit_logs: false,
      }).shouldLoadAuditLogs()
    )
  })

  test('isMinimalLoad true when nothing loaded', ({ assert }) => {
    const dto = new GetTaskDetailDTO({
      task_id: VALID_UUID,
      include_versions: false,
      include_child_tasks: false,
      include_audit_logs: false,
    })
    assert.isTrue(dto.isMinimalLoad())
  })

  test('isMinimalLoad false by default', ({ assert }) => {
    assert.isFalse(new GetTaskDetailDTO({ task_id: VALID_UUID }).isMinimalLoad())
  })

  test('isMinimalLoad false with any include', ({ assert }) => {
    assert.isFalse(
      new GetTaskDetailDTO({
        task_id: VALID_UUID,
        include_versions: true,
        include_child_tasks: false,
        include_audit_logs: false,
      }).isMinimalLoad()
    )
  })
})

// ============================================================================
// GetTaskDetailDTO - Cache Key & Relations
// ============================================================================
test.group('GetTaskDetailDTO | Cache & Relations', () => {
  test('getCacheKey starts with task:detail:', ({ assert }) => {
    const dto = new GetTaskDetailDTO({ task_id: VALID_UUID })
    assert.isTrue(dto.getCacheKey().startsWith('task:detail:'))
  })

  test('getCacheKey includes task_id', ({ assert }) => {
    const dto = new GetTaskDetailDTO({ task_id: VALID_UUID })
    assert.include(dto.getCacheKey(), VALID_UUID)
  })

  test('getCacheKey includes no-versions when versions disabled', ({ assert }) => {
    const dto = new GetTaskDetailDTO({ task_id: VALID_UUID, include_versions: false })
    assert.include(dto.getCacheKey(), 'no-versions')
  })

  test('getCacheKey includes no-children when child_tasks disabled', ({ assert }) => {
    const dto = new GetTaskDetailDTO({ task_id: VALID_UUID, include_child_tasks: false })
    assert.include(dto.getCacheKey(), 'no-children')
  })

  test('getCacheKey includes no-audit when audit_logs disabled', ({ assert }) => {
    const dto = new GetTaskDetailDTO({ task_id: VALID_UUID, include_audit_logs: false })
    assert.include(dto.getCacheKey(), 'no-audit')
  })

  test('getCacheKey includes custom audit limit', ({ assert }) => {
    const dto = new GetTaskDetailDTO({ task_id: VALID_UUID, audit_logs_limit: 50 })
    assert.include(dto.getCacheKey(), 'audit-limit:50')
  })

  test('getCacheKey omits audit-limit for default', ({ assert }) => {
    const dto = new GetTaskDetailDTO({ task_id: VALID_UUID })
    assert.notInclude(dto.getCacheKey(), 'audit-limit')
  })

  test('getCacheKey is deterministic', ({ assert }) => {
    const dto1 = new GetTaskDetailDTO({ task_id: VALID_UUID, include_versions: false })
    const dto2 = new GetTaskDetailDTO({ task_id: VALID_UUID, include_versions: false })
    assert.equal(dto1.getCacheKey(), dto2.getCacheKey())
  })

  test('getRelationsToLoad includes base relations', ({ assert }) => {
    const dto = new GetTaskDetailDTO({
      task_id: VALID_UUID,
      include_versions: false,
      include_child_tasks: false,
    })
    const relations = dto.getRelationsToLoad()
    assert.include(relations, 'creator')
    assert.include(relations, 'assignee')
    assert.include(relations, 'organization')
  })

  test('getRelationsToLoad adds childTasks when enabled', ({ assert }) => {
    const dto = new GetTaskDetailDTO({ task_id: VALID_UUID, include_child_tasks: true })
    assert.include(dto.getRelationsToLoad(), 'childTasks')
  })

  test('getRelationsToLoad omits childTasks when disabled', ({ assert }) => {
    const dto = new GetTaskDetailDTO({ task_id: VALID_UUID, include_child_tasks: false })
    assert.notInclude(dto.getRelationsToLoad(), 'childTasks')
  })

  test('getRelationsToLoad adds versions when enabled', ({ assert }) => {
    const dto = new GetTaskDetailDTO({ task_id: VALID_UUID, include_versions: true })
    assert.include(dto.getRelationsToLoad(), 'versions')
  })

  test('getRelationsToLoad omits versions when disabled', ({ assert }) => {
    const dto = new GetTaskDetailDTO({ task_id: VALID_UUID, include_versions: false })
    assert.notInclude(dto.getRelationsToLoad(), 'versions')
  })
})

// ============================================================================
// GetTaskDetailDTO - Static Factories & Serialization
// ============================================================================
test.group('GetTaskDetailDTO | Factories & Serialization', () => {
  test('createMinimal creates with all includes false', ({ assert }) => {
    const dto = GetTaskDetailDTO.createMinimal(VALID_UUID)
    assert.isTrue(dto.isMinimalLoad())
    assert.equal(dto.task_id, VALID_UUID)
  })

  test('createFull creates with all includes true', ({ assert }) => {
    const dto = GetTaskDetailDTO.createFull(VALID_UUID)
    assert.isTrue(dto.include_versions)
    assert.isTrue(dto.include_child_tasks)
    assert.isTrue(dto.include_audit_logs)
    assert.equal(dto.audit_logs_limit, 50)
  })

  test('toObject includes all fields', ({ assert }) => {
    const dto = new GetTaskDetailDTO({ task_id: VALID_UUID })
    const obj = dto.toObject()
    assert.property(obj, 'task_id')
    assert.property(obj, 'include_versions')
    assert.property(obj, 'include_child_tasks')
    assert.property(obj, 'include_audit_logs')
    assert.property(obj, 'audit_logs_limit')
    assert.property(obj, 'is_minimal_load')
  })

  test('toObject reflects correct values', ({ assert }) => {
    const dto = GetTaskDetailDTO.createMinimal(VALID_UUID)
    const obj = dto.toObject()
    assert.equal(obj.task_id, VALID_UUID)
    assert.isFalse(obj.include_versions as boolean)
    assert.isTrue(obj.is_minimal_load as boolean)
  })
})

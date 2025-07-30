import { test } from '@japa/runner'

import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import { cleanupTestData } from '#tests/helpers/factories'
import WorkHistoryScenario from '#tests/integration/users/support/work_history_scenario'
import type { DatabaseId } from '#types/database'
import { ExecutionContext } from '#types/execution_context'

function buildExecutionContext(userId: DatabaseId) {
  return ExecutionContext.system(userId)
}

test.group('Integration | User Work History', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('inserts materialized work history with quality, evidence, and self-assessment data', async ({
    assert,
  }) => {
    const scenario = await WorkHistoryScenario.build()

    const result = await scenario.runBuild(buildExecutionContext(scenario.reviewee.id))
    const row = await scenario.getWorkHistoryRow()
    const auditLogs = await scenario.getAuditLogs()

    assert.equal(result.userId, scenario.reviewee.id)
    assert.equal(result.totalCompletedAssignments, 1)
    assert.equal(result.inserted, 1)
    assert.equal(result.updated, 0)
    assert.equal(row.task_id, scenario.task.id)
    assert.equal(row.task_title, scenario.task.title)
    assert.equal(row.estimated_hours, 8)
    assert.equal(row.actual_hours, 6)
    assert.isTrue(row.was_on_time ?? false)
    assert.equal(row.overall_quality_score, 4)
    assert.lengthOf(row.skill_scores, 1)
    assert.equal(row.skill_scores[0]?.skill_name, 'TypeScript')
    assert.equal(row.skill_scores[0]?.assigned_level_code, 'senior')
    assert.lengthOf(row.evidence_links, 1)
    assert.equal(row.evidence_links[0]?.evidence_type, 'pull_request')
    assert.equal(row.evidence_links[0]?.title, 'Evidence 1')
    assert.lengthOf(row.knowledge_artifacts, 2)
    assert.equal(row.knowledge_artifacts[0]?.type, 'retrospective_success')
    assert.equal(row.knowledge_artifacts[1]?.type, 'retrospective_improvement')
    assert.equal(row.estimated_business_value, 'team')
    assert.equal(auditLogs.length, 1)
    assert.equal(auditLogs[0]?.new_values?.full_rebuild, false)
    assert.equal(auditLogs[0]?.new_values?.inserted, 1)
    assert.equal(auditLogs[0]?.new_values?.updated, 0)
  })

  test('updates an existing work history row when source analytics change', async ({ assert }) => {
    const scenario = await WorkHistoryScenario.build()

    const firstResult = await scenario.runBuild(buildExecutionContext(scenario.reviewee.id))
    const before = await scenario.getWorkHistoryRow()

    await scenario.updateSessionQuality(2)
    await scenario.addEvidence({
      evidence_type: 'document_link',
      url: 'https://example.com/evidence-2',
      title: 'Evidence 2',
      description: 'Follow-up evidence',
      uploaded_by: scenario.reviewee.id,
    })
    await scenario.replaceSelfAssessment({
      overall_satisfaction: 5,
      difficulty_felt: 'easier_than_expected',
      confidence_level: 4,
      what_went_well: 'Refined delivery',
      what_would_do_different: 'Nothing major',
      skills_felt_strong: ['adonisjs'],
    })

    const secondResult = await scenario.runBuild(buildExecutionContext(scenario.reviewee.id))
    const after = await scenario.getWorkHistoryRow()
    const auditLogs = await scenario.getAuditLogs()

    assert.equal(firstResult.inserted, 1)
    assert.equal(firstResult.updated, 0)
    assert.equal(secondResult.inserted, 0)
    assert.equal(secondResult.updated, 1)
    assert.equal(before.id, after.id)
    assert.equal(after.overall_quality_score, 2)
    assert.lengthOf(after.evidence_links, 2)
    assert.equal(after.evidence_links[1]?.title, 'Evidence 2')
    assert.lengthOf(after.knowledge_artifacts, 2)
    assert.equal(after.knowledge_artifacts[0]?.content, 'Refined delivery')
    assert.equal(after.knowledge_artifacts[1]?.content, 'Nothing major')
    assert.equal(auditLogs.length, 2)
    assert.equal(auditLogs[0]?.new_values?.inserted, 0)
    assert.equal(auditLogs[0]?.new_values?.updated, 1)
  })

  test('full rebuild removes stale rows and rebuilds from current completed assignments', async ({
    assert,
  }) => {
    const scenario = await WorkHistoryScenario.build()
    const { staleAssignmentId } = await scenario.seedStaleWorkHistoryRow()

    const result = await scenario.runBuild(buildExecutionContext(scenario.reviewee.id), true)
    const rows = await scenario.getWorkHistoryRows()
    const rebuiltRow = rows.find((row) => row.task_assignment_id === scenario.assignment.id)
    const staleRow = rows.find((row) => row.task_assignment_id === staleAssignmentId)
    const auditLogs = await scenario.getAuditLogs()

    assert.equal(result.inserted, 1)
    assert.equal(result.updated, 0)
    assert.lengthOf(rows, 1)
    assert.isNotNull(rebuiltRow)
    assert.isUndefined(staleRow)
    assert.equal(auditLogs.length, 1)
    assert.equal(auditLogs[0]?.new_values?.full_rebuild, true)
  })
})

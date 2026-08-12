import crypto from 'node:crypto'

import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import { taskExternalDeps } from '#composition/tasks/task-external-dependencies/task_external_dependencies_composition'
import { TASK_WORK_CONTRACT_V1_FIXTURE } from '#modules/tasks/public_contracts/task-authoring/golden_fixtures'
import CreateTaskDTO from '#modules/tasks/actions/dtos/request/task-authoring/create_task_dto'
import GetTaskDetailDTO from '#modules/tasks/actions/dtos/request/get_task_detail_dto'
import GetTaskDetailQuery from '#modules/tasks/actions/queries/task-reading/get_task_detail_query'
import { makeSystemTaskActionContext } from '#modules/tasks/actions/task_action_context'
import CreateTaskScenario from '#modules/tasks/tests/backend/support/task-authoring/create_task_scenario'
import User from '#modules/users/infra/models/profile/user'
import { cleanupTestData } from '#tests/helpers/factories'

interface ResolvedBriefBody {
  data: {
    id: string
    title: string
    project: { id: string; name: string } | null
    resolved_brief: {
      state: string
      audience: string
      resolutionSource: string
      assignmentSnapshotId: string | null
      assignmentSnapshotHash: string | null
      headRevision: number | null
      specificationVersionId: string | null
      contractVersionId: string | null
      resolvedContract: {
        title: string
        specification: { plainText: string }
        supportingReferences: Array<{ uri: string }>
      } | null
      workFieldProvenance: Record<
        string,
        { source: string; sourceVersionId: string; inherited: boolean }
      > | null
      authoring: {
        specification: { id: string; plainTextProjection: string }
      } | null
      restrictionCode: string | null
    }
  }
}

interface AssignmentSnapshotRow {
  id: string
  snapshot_hash: string
  snapshot_sequence: number
  canonical_snapshot: {
    snapshot: {
      provenance: {
        taskContractVersionId: string
      }
    }
  }
}

test.group('Contract | Task resolved brief audience projection', (group) => {
  group.each.teardown(() => cleanupTestData())

  test('@tva TC-TVA-004 WP-12 creator/assignee/public receive privacy-scoped brief', async ({
    assert,
    client,
  }) => {
    const scenario = await CreateTaskScenario.build()
    const owner = await User.findOrFail(scenario.ownerId)
    const assignee = await scenario.createOrgMember()
    const viewer = await scenario.createOrgMember()
    const manager = await scenario.createProjectManager()
    const secretText = 'INTERNAL pre-order lifecycle, retry, and failure execution contract.'
    const secretUri = `https://internal.example.test/${crypto.randomUUID()}`
    const task = await scenario.create({
      title: 'Resolved pre-order API Task',
      assigned_to: assignee.id,
      task_visibility: 'all',
      authoring: {
        mode: 'operational_only',
        intent: 'publish',
        idempotency_key: `resolved-brief:${crypto.randomUUID()}`,
        expected_head_revision: 0,
        creator_confirmed: true,
        constraints_addressed: true,
        dependencies_addressed: true,
        specification: {
          plain_text: secretText,
          sections: [
            {
              id: crypto.randomUUID(),
              key: 'execution-brief',
              title: 'Execution brief',
              plainText: secretText,
              critical: true,
              hasTextEquivalent: true,
            },
          ],
        },
        work_contract: TASK_WORK_CONTRACT_V1_FIXTURE,
        evidence_contract: {
          mode: 'operational_only',
          requirements: [],
          verificationMethods: [],
          verifierPolicy: {
            reviewerIds: [],
            reviewerRoleCodes: [],
            minimumReviewers: 0,
            disallowSelfReview: true,
          },
          capabilities: [],
          profileEligibility: false,
          privacyClassification: 'internal',
        },
        supporting_references: [
          {
            type: 'document',
            uri: secretUri,
            title: 'Internal source document',
            relevant_section: 'Lifecycle',
            relation: 'requirement_source',
            access_state: 'authenticated',
            privacy_classification: 'internal',
          },
        ],
      },
    })

    const pinnedBriefWithoutCurrentAuthoring = await new GetTaskDetailQuery(
      makeSystemTaskActionContext(assignee.id),
      {
        ...taskExternalDeps,
        resolvedBrief: {
          readCurrentBundle: () =>
            Promise.reject(new Error('Current authoring must not be read for a pinned assignment')),
        },
      }
    ).execute(
      new GetTaskDetailDTO({
        task_id: task.id,
        include_versions: false,
        include_child_tasks: false,
        include_audit_logs: false,
      })
    )
    assert.equal(pinnedBriefWithoutCurrentAuthoring.resolved_brief.state, 'published')
    assert.equal(
      pinnedBriefWithoutCurrentAuthoring.resolved_brief.resolutionSource,
      'assignment_snapshot'
    )

    const creatorResponse = await client.get(`/api/v1/tasks/${task.id}`).loginAs(owner)
    creatorResponse.assertStatus(200)
    const creatorBody = creatorResponse.body() as ResolvedBriefBody
    assert.equal(creatorBody.data.resolved_brief.state, 'published')
    assert.equal(creatorBody.data.resolved_brief.audience, 'creator_edit')
    assert.equal(
      creatorBody.data.resolved_brief.resolvedContract?.specification.plainText,
      secretText
    )
    assert.isNotNull(creatorBody.data.resolved_brief.authoring)

    const assigneeResponse = await client.get(`/api/v1/tasks/${task.id}`).loginAs(assignee)
    assigneeResponse.assertStatus(200)
    const assigneeBody = assigneeResponse.body() as ResolvedBriefBody
    assert.equal(assigneeBody.data.resolved_brief.audience, 'work_participant')
    assert.equal(
      assigneeBody.data.resolved_brief.resolvedContract?.supportingReferences[0]?.uri,
      secretUri
    )
    assert.isNull(assigneeBody.data.resolved_brief.authoring)
    assert.equal(assigneeBody.data.resolved_brief.workFieldProvenance?.['action']?.source, 'task')
    assert.isFalse(assigneeBody.data.resolved_brief.workFieldProvenance?.['action']?.inherited)

    const publicResponse = await client.get(`/api/v1/tasks/${task.id}`).loginAs(viewer)
    publicResponse.assertStatus(200)
    const publicBody = publicResponse.body() as ResolvedBriefBody
    const publicSerialized = JSON.stringify(publicBody.data.resolved_brief)
    assert.equal(publicBody.data.resolved_brief.state, 'restricted')
    assert.equal(publicBody.data.resolved_brief.audience, 'public_preview')
    assert.notInclude(publicSerialized, secretText)
    assert.notInclude(publicSerialized, secretUri)

    const managerResponse = await client.get(`/api/v1/tasks/${task.id}`).loginAs(manager)
    managerResponse.assertStatus(200)
    const managerBody = managerResponse.body() as ResolvedBriefBody
    const managerSerialized = JSON.stringify(managerBody)
    assert.equal(managerBody.data.resolved_brief.audience, 'project_member')
    assert.include(managerSerialized, secretText)
    assert.include(managerSerialized, secretUri)
  })

  test('@tva AR-003 Draft and legacy Tasks are explicit and never receive synthetic published proof', async ({
    assert,
    client,
  }) => {
    const scenario = await CreateTaskScenario.build()
    const owner = await User.findOrFail(scenario.ownerId)
    const draftText = 'Draft execution context awaiting creator confirmation.'
    const draft = await scenario.create({
      title: 'Draft resolved brief',
      authoring: {
        mode: 'evidence_enabled',
        intent: 'save_draft',
        idempotency_key: `resolved-brief-draft:${crypto.randomUUID()}`,
        expected_head_revision: 0,
        creator_confirmed: false,
        specification: { plain_text: draftText },
      },
    })
    const legacy = await scenario.create({ title: 'Legacy unversioned task' })

    const draftResponse = await client.get(`/api/v1/tasks/${draft.id}`).loginAs(owner)
    draftResponse.assertStatus(200)
    const draftBody = draftResponse.body() as ResolvedBriefBody
    assert.equal(draftBody.data.resolved_brief.state, 'draft')
    assert.equal(draftBody.data.resolved_brief.audience, 'creator_edit')
    assert.equal(draftBody.data.resolved_brief.headRevision, 1)
    assert.isNotNull(draftBody.data.resolved_brief.authoring)
    assert.isNull(draftBody.data.resolved_brief.resolvedContract)
    assert.isNull(draftBody.data.resolved_brief.restrictionCode)

    const legacyResponse = await client.get(`/api/v1/tasks/${legacy.id}`).loginAs(owner)
    legacyResponse.assertStatus(200)
    const legacyBody = legacyResponse.body() as ResolvedBriefBody
    assert.equal(legacyBody.data.resolved_brief.state, 'legacy')
    assert.equal(legacyBody.data.resolved_brief.restrictionCode, 'TASK_BRIEF_LEGACY_UNVERSIONED')
    assert.isNull(legacyBody.data.resolved_brief.authoring)
    assert.isNull(legacyBody.data.resolved_brief.resolvedContract)
  }).timeout(10_000)

  test('@tva TC-TVA-014 WP-12/WP-13 completed assignee brief remains pinned while creator reads the advanced authoring head', async ({
    assert,
    client,
  }) => {
    const scenario = await CreateTaskScenario.build()
    const owner = await User.findOrFail(scenario.ownerId)
    const assignee = await scenario.createOrgMember()
    const assignedText = 'PINNED v1 lifecycle, retry, and failure execution contract.'
    const currentText = 'CURRENT v2 authoring with changed rollout and compatibility requirements.'
    const currentTaskTitle = 'Mutable current Task title after assignment'
    const currentProjectName = 'Mutable current Project name after assignment'
    const task = await scenario.create({
      title: 'Assigned v1 pre-order API Task',
      description: 'Assignment-time Task row',
      assigned_to: assignee.id,
      task_visibility: 'all',
      authoring: {
        mode: 'operational_only',
        intent: 'publish',
        idempotency_key: `resolved-brief-pinned-v1:${crypto.randomUUID()}`,
        expected_head_revision: 0,
        creator_confirmed: true,
        constraints_addressed: true,
        dependencies_addressed: true,
        specification: {
          plain_text: assignedText,
          sections: [
            {
              id: crypto.randomUUID(),
              key: 'assignment-brief',
              title: 'Assignment brief',
              plainText: assignedText,
              critical: true,
              hasTextEquivalent: true,
            },
          ],
        },
        work_contract: TASK_WORK_CONTRACT_V1_FIXTURE,
        evidence_contract: {
          mode: 'operational_only',
          requirements: [],
          verificationMethods: [],
          verifierPolicy: {
            reviewerIds: [],
            reviewerRoleCodes: [],
            minimumReviewers: 0,
            disallowSelfReview: true,
          },
          capabilities: [],
          profileEligibility: false,
          privacyClassification: 'internal',
        },
      },
    })
    const pinnedSnapshot = (await db
      .from('task_assignment_snapshots')
      .select('id', 'snapshot_hash', 'snapshot_sequence', 'canonical_snapshot')
      .where('task_id', task.id)
      .whereNotNull('schema_version')
      .first()) as AssignmentSnapshotRow | undefined
    if (!pinnedSnapshot) throw new Error('Assigned Task must have its canonical snapshot')

    const authoring = taskExternalDeps.authoring
    if (!authoring) throw new Error('Production Task authoring composition is unavailable')
    const taskStatusId = task.task_status_id
    if (!taskStatusId) throw new Error('Created Task must have a workflow status')
    await db.transaction((trx) =>
      authoring.persistVersion({
        taskId: task.id,
        actorId: owner.id,
        dto: new CreateTaskDTO({
          title: currentTaskTitle,
          description: 'Mutable current Task row after assignment',
          task_status_id: taskStatusId,
          organization_id: scenario.organizationId,
          project_id: scenario.project.id,
          task_visibility: 'all',
          assigned_to: assignee.id,
          task_type: 'feature_development',
          acceptance_criteria: 'All pinned assignment criteria remain verifiable.',
          verification_method: 'manual_qa',
          required_skills: scenario.requiredSkillIds.map((skillId) => ({
            id: skillId,
            level: 'l7',
          })),
          authoring: {
            mode: 'operational_only',
            intent: 'publish',
            idempotency_key: `resolved-brief-current-v2:${crypto.randomUUID()}`,
            expected_head_revision: 1,
            creator_confirmed: true,
            constraints_addressed: true,
            dependencies_addressed: true,
            specification: {
              plain_text: currentText,
              sections: [
                {
                  id: crypto.randomUUID(),
                  key: 'current-brief',
                  title: 'Current brief',
                  plainText: currentText,
                  critical: true,
                  hasTextEquivalent: true,
                },
              ],
            },
            work_contract: TASK_WORK_CONTRACT_V1_FIXTURE,
            evidence_contract: {
              mode: 'operational_only',
              requirements: [],
              verificationMethods: [],
              verifierPolicy: {
                reviewerIds: [],
                reviewerRoleCodes: [],
                minimumReviewers: 0,
                disallowSelfReview: true,
              },
              capabilities: [],
              profileEligibility: false,
              privacyClassification: 'internal',
            },
          },
        }),
        trx,
      })
    )
    await db.from('tasks').where('id', task.id).update({
      title: currentTaskTitle,
      description: 'Mutable current Task row after assignment',
    })
    await db.from('projects').where('id', scenario.project.id).update({ name: currentProjectName })

    const creatorResponse = await client.get(`/api/v1/tasks/${task.id}`).loginAs(owner)
    creatorResponse.assertStatus(200)
    const creatorBody = creatorResponse.body() as ResolvedBriefBody
    assert.equal(creatorBody.data.title, currentTaskTitle)
    assert.equal(creatorBody.data.project?.name, currentProjectName)
    assert.equal(creatorBody.data.resolved_brief.audience, 'creator_edit')
    assert.equal(creatorBody.data.resolved_brief.resolutionSource, 'current_authoring')
    assert.equal(creatorBody.data.resolved_brief.headRevision, 2)
    assert.equal(
      creatorBody.data.resolved_brief.resolvedContract?.specification.plainText,
      currentText
    )
    assert.equal(
      creatorBody.data.resolved_brief.authoring?.specification.plainTextProjection,
      currentText
    )
    assert.isNull(creatorBody.data.resolved_brief.assignmentSnapshotId)

    await db
      .from('task_assignments')
      .where('task_id', task.id)
      .where('assignee_id', assignee.id)
      .update({ assignment_status: 'completed', completed_at: new Date() })

    const assigneeResponse = await client.get(`/api/v1/tasks/${task.id}`).loginAs(assignee)
    assigneeResponse.assertStatus(200)
    const assigneeBody = assigneeResponse.body() as ResolvedBriefBody
    assert.equal(assigneeBody.data.title, currentTaskTitle)
    assert.equal(assigneeBody.data.project?.name, currentProjectName)
    assert.equal(assigneeBody.data.resolved_brief.audience, 'work_participant')
    assert.equal(assigneeBody.data.resolved_brief.resolutionSource, 'assignment_snapshot')
    assert.equal(assigneeBody.data.resolved_brief.assignmentSnapshotId, pinnedSnapshot.id)
    assert.equal(
      assigneeBody.data.resolved_brief.assignmentSnapshotHash,
      pinnedSnapshot.snapshot_hash
    )
    assert.equal(assigneeBody.data.resolved_brief.headRevision, pinnedSnapshot.snapshot_sequence)
    assert.equal(
      assigneeBody.data.resolved_brief.contractVersionId,
      pinnedSnapshot.canonical_snapshot.snapshot.provenance.taskContractVersionId
    )
    assert.equal(
      assigneeBody.data.resolved_brief.resolvedContract?.specification.plainText,
      assignedText
    )
    assert.notEqual(
      assigneeBody.data.resolved_brief.resolvedContract?.specification.plainText,
      currentText
    )
    assert.isNull(assigneeBody.data.resolved_brief.authoring)
    assert.lengthOf(
      await db
        .from('task_assignment_snapshots')
        .where('task_id', task.id)
        .whereNotNull('schema_version'),
      1
    )
  }).timeout(10_000)

  test('@tva AS-013 reassignment between authorization and brief load fails closed without loading the next assignee snapshot', async ({
    assert,
  }) => {
    const scenario = await CreateTaskScenario.build()
    const firstAssignee = await scenario.createOrgMember()
    const nextAssignee = await scenario.createOrgMember()
    const task = await scenario.create({
      title: 'Actor-bound assignment race contract',
      assigned_to: firstAssignee.id,
      task_visibility: 'all',
      authoring: {
        mode: 'operational_only',
        intent: 'publish',
        idempotency_key: `resolved-brief-race:${crypto.randomUUID()}`,
        expected_head_revision: 0,
        creator_confirmed: true,
        constraints_addressed: true,
        dependencies_addressed: true,
        specification: { plain_text: 'First assignee private execution contract.' },
        work_contract: TASK_WORK_CONTRACT_V1_FIXTURE,
        evidence_contract: {
          mode: 'operational_only',
          requirements: [],
          verificationMethods: [],
          verifierPolicy: {
            reviewerIds: [],
            reviewerRoleCodes: [],
            minimumReviewers: 0,
            disallowSelfReview: true,
          },
          capabilities: [],
          profileEligibility: false,
          privacyClassification: 'internal',
        },
      },
    })
    const assignmentReader = taskExternalDeps.activeAssignmentReader
    if (!assignmentReader) throw new Error('Production assignment reader is unavailable')
    const authorizedAccess = await assignmentReader.findActorAssignment(task.id, firstAssignee.id)
    if (!authorizedAccess) throw new Error('First assignee must have actor-bound access')
    let actorAccessReads = 0
    const interleavedReader = {
      findActiveAssignment: assignmentReader.findActiveAssignment.bind(assignmentReader),
      findActorAssignment(_taskId: string, _actorId: string) {
        actorAccessReads += 1
        if (actorAccessReads === 1) return Promise.resolve(authorizedAccess)
        return Promise.resolve({
          id: crypto.randomUUID(),
          assigneeId: nextAssignee.id,
          status: 'active' as const,
        })
      },
    }
    const result = await new GetTaskDetailQuery(makeSystemTaskActionContext(firstAssignee.id), {
      ...taskExternalDeps,
      activeAssignmentReader: interleavedReader,
    }).execute(
      new GetTaskDetailDTO({
        task_id: task.id,
        include_versions: false,
        include_child_tasks: false,
        include_audit_logs: false,
      })
    )

    assert.equal(actorAccessReads, 2)
    assert.equal(result.resolved_brief.state, 'restricted')
    assert.equal(result.resolved_brief.audience, 'work_participant')
    assert.equal(result.resolved_brief.restrictionCode, 'TASK_BRIEF_ASSIGNMENT_ACCESS_STALE')
    assert.isNull(result.resolved_brief.assignmentSnapshotId)
    assert.isNull(result.resolved_brief.resolvedContract)
  }).timeout(10_000)
})

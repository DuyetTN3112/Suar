import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { test } from '@japa/runner'

import {
  OrganizationMemberProjectOffboardingAdapter,
  type OrganizationMemberProjectOffboardingDependencies,
} from '#composition/organizations/members/adapters/organization_member_project_offboarding_adapter'

const ORGANIZATION_ID = '11111111-1111-4111-8111-111111111111'
const USER_ID = '22222222-2222-4222-8222-222222222222'
const PROJECT_IDS = [
  '33333333-3333-4333-8333-333333333333',
  '44444444-4444-4444-8444-444444444444',
]

function transaction(): TransactionClientContract {
  return { transactionMarker: 'organization-removal' } as unknown as TransactionClientContract
}

test.group('Organization member project offboarding adapter', () => {
  test('uses the source transaction and removes task ownership before project access', async ({
    assert,
  }) => {
    const trx = transaction()
    const calls: Array<{ operation: string; trx: TransactionClientContract }> = []
    const dependencies: OrganizationMemberProjectOffboardingDependencies = {
      findProjectIdsByOrganization: (organizationId, receivedTrx) => {
        assert.equal(organizationId, ORGANIZATION_ID)
        calls.push({
          operation: 'find_projects',
          trx: receivedTrx as TransactionClientContract,
        })
        return Promise.resolve(PROJECT_IDS)
      },
      unassignTasksByUserInProjects: (projectIds, userId, receivedTrx) => {
        assert.deepEqual(projectIds, PROJECT_IDS)
        assert.equal(userId, USER_ID)
        calls.push({
          operation: 'unassign_tasks',
          trx: receivedTrx as TransactionClientContract,
        })
        return Promise.resolve()
      },
      deleteMemberFromProjects: (projectIds, userId, receivedTrx) => {
        assert.deepEqual(projectIds, PROJECT_IDS)
        assert.equal(userId, USER_ID)
        calls.push({ operation: 'delete_project_memberships', trx: receivedTrx })
        return Promise.resolve([])
      },
    }

    await new OrganizationMemberProjectOffboardingAdapter(dependencies).offboardMember(
      ORGANIZATION_ID,
      USER_ID,
      trx
    )

    assert.deepEqual(
      calls.map(({ operation }) => operation),
      ['find_projects', 'unassign_tasks', 'delete_project_memberships']
    )
    assert.isTrue(calls.every((call) => call.trx === trx))
  })

  test('propagates cleanup failure so the organization transaction can roll back', async ({
    assert,
  }) => {
    let membershipsDeleted = false
    const failure = new Error('project task cleanup unavailable')

    await assert.rejects(
      () =>
        new OrganizationMemberProjectOffboardingAdapter({
          findProjectIdsByOrganization: () => Promise.resolve(PROJECT_IDS),
          unassignTasksByUserInProjects: () => Promise.reject(failure),
          deleteMemberFromProjects: () => {
            membershipsDeleted = true
            return Promise.resolve([])
          },
        }).offboardMember(ORGANIZATION_ID, USER_ID, transaction()),
      /project task cleanup unavailable/
    )

    assert.isFalse(membershipsDeleted)
  })

  test('performs no mutation when the organization has no active projects', async ({
    assert,
  }) => {
    let mutationCalls = 0

    await new OrganizationMemberProjectOffboardingAdapter({
      findProjectIdsByOrganization: () => Promise.resolve([]),
      unassignTasksByUserInProjects: () => {
        mutationCalls += 1
        return Promise.resolve()
      },
      deleteMemberFromProjects: () => {
        mutationCalls += 1
        return Promise.resolve([])
      },
    }).offboardMember(ORGANIZATION_ID, USER_ID, transaction())

    assert.equal(mutationCalls, 0)
  })
})

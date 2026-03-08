import { test } from '@japa/runner'
import {
  OrganizationRole,
  OrganizationUserStatus,
  OrganizationPlan,
  PartnerType,
} from '#constants/organization_constants'

test.group('OrganizationConstants', () => {
  test('OrganizationRole enum has correct values matching DB CHECK', ({ assert }) => {
    assert.equal(OrganizationRole.OWNER, 'org_owner')
    assert.equal(OrganizationRole.ADMIN, 'org_admin')
    assert.equal(OrganizationRole.MEMBER, 'org_member')
    assert.equal(Object.values(OrganizationRole).length, 3)
  })

  test('OrganizationUserStatus enum has correct values', ({ assert }) => {
    assert.equal(OrganizationUserStatus.PENDING, 'pending')
    assert.equal(OrganizationUserStatus.APPROVED, 'approved')
    assert.equal(OrganizationUserStatus.REJECTED, 'rejected')
    assert.equal(Object.values(OrganizationUserStatus).length, 3)
  })

  test('OrganizationPlan enum has correct values', ({ assert }) => {
    assert.equal(OrganizationPlan.FREE, 'free')
    assert.equal(OrganizationPlan.STARTER, 'starter')
    assert.equal(OrganizationPlan.PROFESSIONAL, 'professional')
    assert.equal(OrganizationPlan.ENTERPRISE, 'enterprise')
    assert.equal(Object.values(OrganizationPlan).length, 4)
  })

  test('PartnerType enum has correct values matching DB CHECK', ({ assert }) => {
    assert.equal(PartnerType.GOLD, 'gold')
    assert.equal(PartnerType.SILVER, 'silver')
    assert.equal(PartnerType.BRONZE, 'bronze')
    assert.equal(Object.values(PartnerType).length, 3)
  })
})

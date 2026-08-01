import { test } from '@japa/runner'

import { SEED_USERS_SPECS } from '../../../../../seed/demo_data/user_seeds_specs.js'

import {
  buildDemoPersonaReadinessReport,
  isPlaceholderPersonaProviderId,
} from '#modules/testing/public_contracts/demo_persona_readiness'


test.group('Unit | Demo persona readiness', () => {
  test('flags placeholder provider ids and documents shared-provider switching cost', ({
    assert,
  }) => {
    const report = buildDemoPersonaReadinessReport({
      providerIds: {
        owner: 'github-real-owner',
        superadmin: 'google-real-superadmin',
        member: 'seed-github-member',
        orgAdmin: 'google-real-org-admin',
        peerReviewer: 'seed-google-peer-reviewer',
        orgBOwner: 'google-real-org-b-owner',
        externalContributorOne: 'seed-github-external-contributor-one',
        externalContributorTwo: 'github-real-external-contributor-two',
      },
    })

    assert.equal(report.length, Object.keys(SEED_USERS_SPECS).length)
    assert.isTrue(report.every((row) => row.email.length > 0))
    assert.equal(report.find((row) => row.key === 'owner')?.reachable, true)
    assert.equal(report.find((row) => row.key === 'member')?.reachable, false)
    assert.equal(report.find((row) => row.key === 'member')?.reason, 'placeholder provider id seed-github-member')
    assert.equal(report.find((row) => row.key === 'peerReviewer')?.reachable, false)
    assert.equal(report.find((row) => row.key === 'externalContributorOne')?.reachable, false)

    const githubRows = report.filter((row) => row.provider === 'github')
    assert.isTrue(githubRows.every((row) => row.sharedProvider))
    assert.isTrue(
      githubRows.every(
        (row) => row.switchingCost === 'switching requires signing out of the provider itself'
      )
    )
  })

  test('recognizes placeholder provider ids by prefix', ({ assert }) => {
    assert.isTrue(isPlaceholderPersonaProviderId('seed-google-owner'))
    assert.isTrue(isPlaceholderPersonaProviderId('seed-github-member'))
    assert.isFalse(isPlaceholderPersonaProviderId('google-real-owner'))
  })
})

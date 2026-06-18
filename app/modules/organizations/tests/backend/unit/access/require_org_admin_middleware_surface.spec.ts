import { readFileSync } from 'node:fs'

import { test } from '@japa/runner'

test.group('RequireOrgAdminMiddleware permission-denied surface', () => {
  test('org-admin refusals throw 403 instead of flash-and-redirect teleporting to root', ({
    assert,
  }) => {
    const source = readFileSync(
      'app/modules/organizations/middleware/access/require_org_admin_middleware.ts',
      'utf8'
    )

    assert.include(source, 'ForbiddenException')
    assert.include(source, 'Organization administrator or owner privileges required')
    assert.notInclude(source, "response.redirect().toPath('/')")
    assert.notInclude(source, "response.redirect('/admin')")
    assert.notInclude(source, "Access denied. Organization administrator or owner privileges required.")
  })

  test('system admin status does not hijack organization-admin access', ({ assert }) => {
    const source = readFileSync(
      'app/modules/organizations/middleware/access/require_org_admin_middleware.ts',
      'utf8'
    )

    assert.notInclude(source, 'canAccessSystemAdministration')
    assert.notInclude(source, 'Use the system admin workspace for platform administration')
  })

  test('the exception handler renders forbidden status pages for 403s', ({ assert }) => {
    const source = readFileSync('app/modules/http/exceptions/handler.ts', 'utf8')
    const forbiddenBranch = source.slice(
      source.indexOf('// 403 — Forbidden'),
      source.indexOf('// 404 — Not Found')
    )

    assert.include(source, "'403'")
    assert.include(source, 'InertiaPages.ERROR_FORBIDDEN')
    assert.include(source, 'inertia.render(InertiaPages.ERROR_FORBIDDEN')
    assert.match(
      forbiddenBranch,
      /handledError\.status === HttpStatus\.FORBIDDEN[\s\S]*response\.status\(HttpStatus\.FORBIDDEN\)[\s\S]*inertia\.render\(InertiaPages\.ERROR_FORBIDDEN/
    )
    assert.notInclude(forbiddenBranch, 'session.flash')
    assert.notInclude(forbiddenBranch, 'response.redirect().back()')
  })
})

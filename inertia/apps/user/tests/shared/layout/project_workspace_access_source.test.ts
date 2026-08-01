import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const sourcePath = resolve(
  process.cwd(),
  'inertia/apps/user/shared/components/layout/control_sidebar.svelte'
)

describe('personal sidebar project workspace access', () => {
  it('fails closed when shared workspace access has no enterable project', () => {
    const source = readFileSync(sourcePath, 'utf8')

    expect(source).toContain(
      'const canEnterProjectWorkspace = $derived(enterableProjects.length > 0)'
    )
    expect(source).toContain(
      '{#if canEnterProjectWorkspace && currentWorkspaceProjectId}'
    )
    expect(source).toContain(
      '{#if currentOrg && showProjectSwitcher && canEnterProjectWorkspace}'
    )
    expect(source).not.toContain(
      "onclick={() => visitWorkspaceRedirect('/projects', () => onClose?.())}"
    )
  })
})

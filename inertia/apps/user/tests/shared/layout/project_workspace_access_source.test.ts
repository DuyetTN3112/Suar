import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const sourcePath = resolve(
  process.cwd(),
  'inertia/apps/user/shared/components/layout/control_sidebar.svelte'
)

describe('personal sidebar project workspace access', () => {
  it('exposes a project workspace switch only for projects the user may enter', () => {
    const source = readFileSync(sourcePath, 'utf8')

    expect(source).toContain('const contextProjects = $derived(workspaceAccess?.projects ?? [])')
    expect(source).toContain('const enterableProjects = $derived(contextProjects.filter((project) => project.canEnter))')
    expect(source).toContain('const canEnterProjectWorkspace = $derived(projectWorkspaceProject !== null)')
    expect(source).toContain(
      '{#if currentOrg && showProjectSwitcher && contextProjects.length > 0}'
    )
    expect(source).toContain('{#if canEnterProjectWorkspace}')
    expect(source).toContain("t('common.sidebar.project_workspace', {}, 'Project workspace')")
  })

  it('keeps personal and project workspace choices explicit', () => {
    const source = readFileSync(sourcePath, 'utf8')

    expect(source).toContain(
      'const showPersonalWorkspace = $derived(\n    !canEnterProjectWorkspace && !canEnterOrganizationWorkspace\n  )'
    )
    expect(source).toContain('{#if showPersonalWorkspace}')
    expect(source).toContain("workspaceMode === 'personal'")
    expect(source).toContain("workspaceMode === 'project'")
    expect(source).toContain('async function enterProjectWorkspace()')
    expect(source).toContain('requestProjectSwitch({')
  })
})
